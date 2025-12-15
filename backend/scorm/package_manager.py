"""
SCORM Package Manager

Handles SCORM package upload, validation, and extraction.
Supports SCORM 1.2 and SCORM 2004 standards.
"""

import os
import zipfile
import shutil
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass

from lxml import etree
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile


@dataclass
class ValidationResult:
    """Result of package validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    
    def __bool__(self):
        return self.is_valid


@dataclass
class ManifestData:
    """Parsed manifest data"""
    identifier: str
    version: str  # '1.2' or '2004'
    title: str
    description: str
    organizations: List[Dict]
    resources: List[Dict]
    metadata: Dict
    scos: List[Dict]  # List of SCO data


class ScormPackageManager:
    """
    Manages SCORM package lifecycle including validation, extraction, and parsing.
    
    Supports SCORM 1.2 and SCORM 2004 packages.
    """
    
    # SCORM namespaces
    SCORM_12_NAMESPACE = {
        'imscp': 'http://www.imsproject.org/xsd/imscp_rootv1p1p2',
        'adlcp': 'http://www.adlnet.org/xsd/adlcp_rootv1p2',
        'imsmd': 'http://www.imsglobal.org/xsd/imsmd_rootv1p2p1'
    }
    
    SCORM_2004_NAMESPACE = {
        'imscp': 'http://www.imsglobal.org/xsd/imscp_v1p1',
        'adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
        'adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
        'adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
        'imsss': 'http://www.imsglobal.org/xsd/imsss'
    }
    
    MANIFEST_FILENAME = 'imsmanifest.xml'
    MAX_PACKAGE_SIZE = 100 * 1024 * 1024  # 100 MB default
    
    def __init__(self, max_package_size: Optional[int] = None):
        """
        Initialize the package manager.
        
        Args:
            max_package_size: Maximum allowed package size in bytes
        """
        self.max_package_size = max_package_size or self.MAX_PACKAGE_SIZE
    
    def validate_package(self, zip_file: UploadedFile) -> ValidationResult:
        """
        Validate SCORM package structure and contents.
        
        Checks:
        - File is a valid ZIP archive
        - Contains imsmanifest.xml
        - Manifest is valid XML
        - Package size is within limits
        - SCORM version is supported
        
        Args:
            zip_file: Uploaded ZIP file
            
        Returns:
            ValidationResult with validation status and any errors/warnings
            
        **Validates: Requirements 1.1, 1.4**
        """
        errors = []
        warnings = []
        
        # Check file size
        if zip_file.size > self.max_package_size:
            errors.append(
                f"Package size ({zip_file.size} bytes) exceeds maximum "
                f"allowed size ({self.max_package_size} bytes)"
            )
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Check if it's a valid ZIP file
        try:
            if not zipfile.is_zipfile(zip_file):
                errors.append("File is not a valid ZIP archive")
                return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        except Exception as e:
            errors.append(f"Error checking ZIP file: {str(e)}")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Open and validate ZIP contents
        try:
            with zipfile.ZipFile(zip_file, 'r') as zf:
                # Check for manifest file
                manifest_found = False
                manifest_path = None
                
                for name in zf.namelist():
                    if name.endswith(self.MANIFEST_FILENAME):
                        manifest_found = True
                        manifest_path = name
                        break
                
                if not manifest_found:
                    errors.append(f"{self.MANIFEST_FILENAME} not found in package")
                    return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
                
                # Validate manifest XML
                try:
                    manifest_content = zf.read(manifest_path)
                    root = etree.fromstring(manifest_content)
                    
                    # Detect SCORM version
                    version = self._detect_scorm_version(root)
                    if version not in ['1.2', '2004']:
                        errors.append(f"Unsupported SCORM version: {version}")
                        return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
                    
                    # Validate required elements exist
                    namespaces = self._get_namespaces(version)
                    
                    # Check for organizations
                    organizations = root.find('.//imscp:organizations', namespaces)
                    if organizations is None:
                        errors.append("Manifest missing <organizations> element")
                    
                    # Check for resources
                    resources = root.find('.//imscp:resources', namespaces)
                    if resources is None:
                        errors.append("Manifest missing <resources> element")
                    
                    # Check for at least one SCO
                    sco_found = False
                    if resources is not None:
                        for resource in resources.findall('.//imscp:resource', namespaces):
                            scorm_type = resource.get('{http://www.adlnet.org/xsd/adlcp_rootv1p2}scormtype') or \
                                       resource.get('{http://www.adlnet.org/xsd/adlcp_v1p3}scormType')
                            if scorm_type == 'sco':
                                sco_found = True
                                break
                    
                    if not sco_found:
                        warnings.append("No SCO (Sharable Content Object) found in package")
                
                except etree.XMLSyntaxError as e:
                    errors.append(f"Invalid XML in manifest: {str(e)}")
                    return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
                except Exception as e:
                    errors.append(f"Error parsing manifest: {str(e)}")
                    return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
                
                # Test ZIP integrity
                bad_file = zf.testzip()
                if bad_file:
                    errors.append(f"Corrupted file in ZIP: {bad_file}")
                    return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        except zipfile.BadZipFile:
            errors.append("Invalid or corrupted ZIP file")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        except Exception as e:
            errors.append(f"Error validating package: {str(e)}")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # If we got here, validation passed
        return ValidationResult(is_valid=True, errors=errors, warnings=warnings)
    
    def extract_manifest(self, zip_file: UploadedFile) -> ManifestData:
        """
        Extract and parse the imsmanifest.xml file from a SCORM package.
        
        Extracts metadata including:
        - Package identifier
        - SCORM version
        - Title and description
        - Organization structure
        - Resources and SCOs
        
        Args:
            zip_file: Uploaded ZIP file (must be validated first)
            
        Returns:
            ManifestData object with parsed manifest information
            
        Raises:
            ValueError: If manifest cannot be found or parsed
            
        **Validates: Requirements 1.2**
        """
        try:
            with zipfile.ZipFile(zip_file, 'r') as zf:
                # Find manifest file
                manifest_path = None
                for name in zf.namelist():
                    if name.endswith(self.MANIFEST_FILENAME):
                        manifest_path = name
                        break
                
                if not manifest_path:
                    raise ValueError(f"{self.MANIFEST_FILENAME} not found in package")
                
                # Read and parse manifest
                manifest_content = zf.read(manifest_path)
                root = etree.fromstring(manifest_content)
                
                # Detect version
                version = self._detect_scorm_version(root)
                namespaces = self._get_namespaces(version)
                
                # Extract identifier
                identifier = root.get('identifier')
                if not identifier:
                    raise ValueError("Manifest missing identifier attribute")
                
                # Extract metadata
                metadata_elem = root.find('.//imscp:metadata', namespaces)
                metadata = self._parse_metadata(metadata_elem, namespaces) if metadata_elem is not None else {}
                
                # Extract title and description from metadata or organizations
                title = metadata.get('title', 'Untitled SCORM Package')
                description = metadata.get('description', '')
                
                # If not in metadata, try to get from first organization
                if title == 'Untitled SCORM Package':
                    orgs = root.find('.//imscp:organizations', namespaces)
                    if orgs is not None:
                        default_org = orgs.get('default')
                        if default_org:
                            org = orgs.find(f'.//imscp:organization[@identifier="{default_org}"]', namespaces)
                        else:
                            org = orgs.find('.//imscp:organization', namespaces)
                        
                        if org is not None:
                            title_elem = org.find('.//imscp:title', namespaces)
                            if title_elem is not None and title_elem.text:
                                title = title_elem.text.strip()
                
                # Parse organizations
                organizations = self._parse_organizations(root, namespaces)
                
                # Parse resources
                resources = self._parse_resources(root, namespaces, version)
                
                # Extract SCO information
                scos = self._extract_scos(organizations, resources)
                
                return ManifestData(
                    identifier=identifier,
                    version=version,
                    title=title,
                    description=description,
                    organizations=organizations,
                    resources=resources,
                    metadata=metadata,
                    scos=scos
                )
        
        except etree.XMLSyntaxError as e:
            raise ValueError(f"Invalid XML in manifest: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error extracting manifest: {str(e)}")
    
    def extract_content(self, zip_file: UploadedFile, destination: str) -> List[str]:
        """
        Extract SCORM package content files to storage.
        
        Extracts all files from the ZIP package to the specified destination
        directory, maintaining the original directory structure.
        
        Args:
            zip_file: Uploaded ZIP file
            destination: Destination directory path (relative to MEDIA_ROOT)
            
        Returns:
            List of extracted file paths (relative to destination)
            
        Raises:
            ValueError: If extraction fails
            OSError: If file system operations fail
            
        **Validates: Requirements 1.1, 1.4**
        """
        extracted_files = []
        
        try:
            # Create full destination path
            media_root = getattr(settings, 'MEDIA_ROOT', 'media')
            full_destination = os.path.join(media_root, destination)
            
            # Create destination directory if it doesn't exist
            os.makedirs(full_destination, exist_ok=True)
            
            # Extract all files
            with zipfile.ZipFile(zip_file, 'r') as zf:
                for member in zf.namelist():
                    # Skip directories
                    if member.endswith('/'):
                        continue
                    
                    # Extract file
                    try:
                        zf.extract(member, full_destination)
                        extracted_files.append(member)
                    except Exception as e:
                        # Clean up on error
                        if os.path.exists(full_destination):
                            shutil.rmtree(full_destination)
                        raise ValueError(f"Error extracting file {member}: {str(e)}")
            
            return extracted_files
        
        except zipfile.BadZipFile:
            raise ValueError("Invalid or corrupted ZIP file")
        except OSError as e:
            raise OSError(f"File system error during extraction: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error extracting content: {str(e)}")
    
    def _detect_scorm_version(self, root: etree.Element) -> str:
        """
        Detect SCORM version from manifest root element.
        
        Args:
            root: Parsed XML root element
            
        Returns:
            Version string: '1.2' or '2004'
        """
        # Check schema location for version hints
        schema_location = root.get('{http://www.w3.org/2001/XMLSchema-instance}schemaLocation', '')
        
        if 'adlcp_v1p3' in schema_location or 'imsss' in schema_location:
            return '2004'
        elif 'adlcp_rootv1p2' in schema_location:
            return '1.2'
        
        # Check namespace URIs
        nsmap = root.nsmap
        for prefix, uri in nsmap.items():
            if 'adlcp_v1p3' in uri or 'imsss' in uri:
                return '2004'
            elif 'adlcp_rootv1p2' in uri:
                return '1.2'
        
        # Default to 1.2 if cannot determine
        return '1.2'
    
    def _get_namespaces(self, version: str) -> Dict[str, str]:
        """Get appropriate namespaces for SCORM version"""
        if version == '2004':
            return self.SCORM_2004_NAMESPACE
        return self.SCORM_12_NAMESPACE
    
    def _parse_metadata(self, metadata_elem: etree.Element, namespaces: Dict[str, str]) -> Dict:
        """Parse metadata element"""
        metadata = {}
        
        # Try to find title in various locations
        # Only search if imsmd namespace is available
        if 'imsmd' in namespaces:
            try:
                title_elem = metadata_elem.find('.//imsmd:title/imsmd:langstring', namespaces)
                if title_elem is not None and title_elem.text:
                    metadata['title'] = title_elem.text.strip()
                
                # Try to find description
                desc_elem = metadata_elem.find('.//imsmd:description/imsmd:langstring', namespaces)
                if desc_elem is not None and desc_elem.text:
                    metadata['description'] = desc_elem.text.strip()
            except Exception:
                # If metadata parsing fails, just return empty metadata
                pass
        
        return metadata
    
    def _parse_organizations(self, root: etree.Element, namespaces: Dict[str, str]) -> List[Dict]:
        """Parse organizations structure"""
        organizations = []
        
        orgs_elem = root.find('.//imscp:organizations', namespaces)
        if orgs_elem is None:
            return organizations
        
        for org in orgs_elem.findall('.//imscp:organization', namespaces):
            org_data = {
                'identifier': org.get('identifier'),
                'structure': org.get('structure', 'hierarchical'),
                'title': '',
                'items': []
            }
            
            # Get title
            title_elem = org.find('.//imscp:title', namespaces)
            if title_elem is not None and title_elem.text:
                org_data['title'] = title_elem.text.strip()
            
            # Parse items recursively
            org_data['items'] = self._parse_items(org, namespaces)
            
            organizations.append(org_data)
        
        return organizations
    
    def _parse_items(self, parent: etree.Element, namespaces: Dict[str, str]) -> List[Dict]:
        """Recursively parse organization items"""
        items = []
        
        for item in parent.findall('./imscp:item', namespaces):
            item_data = {
                'identifier': item.get('identifier'),
                'identifierref': item.get('identifierref'),
                'title': '',
                'parameters': item.get('parameters', ''),
                'isvisible': item.get('isvisible', 'true'),
                'children': []
            }
            
            # Get title
            title_elem = item.find('./imscp:title', namespaces)
            if title_elem is not None and title_elem.text:
                item_data['title'] = title_elem.text.strip()
            
            # Parse child items
            item_data['children'] = self._parse_items(item, namespaces)
            
            items.append(item_data)
        
        return items
    
    def _parse_resources(self, root: etree.Element, namespaces: Dict[str, str], version: str) -> List[Dict]:
        """Parse resources section"""
        resources = []
        
        resources_elem = root.find('.//imscp:resources', namespaces)
        if resources_elem is None:
            return resources
        
        for resource in resources_elem.findall('.//imscp:resource', namespaces):
            # Get scormType attribute (different in 1.2 vs 2004)
            if version == '2004':
                scorm_type = resource.get('{http://www.adlnet.org/xsd/adlcp_v1p3}scormType', 'asset')
            else:
                scorm_type = resource.get('{http://www.adlnet.org/xsd/adlcp_rootv1p2}scormtype', 'asset')
            
            resource_data = {
                'identifier': resource.get('identifier'),
                'type': resource.get('type', 'webcontent'),
                'href': resource.get('href', ''),
                'scorm_type': scorm_type,
                'files': []
            }
            
            # Parse file references
            for file_elem in resource.findall('./imscp:file', namespaces):
                file_href = file_elem.get('href')
                if file_href:
                    resource_data['files'].append(file_href)
            
            resources.append(resource_data)
        
        return resources
    
    def _extract_scos(self, organizations: List[Dict], resources: List[Dict]) -> List[Dict]:
        """
        Extract SCO information by matching organization items with resources.
        
        Args:
            organizations: Parsed organization structure
            resources: Parsed resources
            
        Returns:
            List of SCO data dictionaries
        """
        scos = []
        
        # Create resource lookup by identifier
        resource_map = {r['identifier']: r for r in resources}
        
        # Extract SCOs from organization items
        for org in organizations:
            scos.extend(self._extract_scos_from_items(org['items'], resource_map, 0))
        
        return scos
    
    def _extract_scos_from_items(self, items: List[Dict], resource_map: Dict, order: int) -> List[Dict]:
        """Recursively extract SCOs from organization items"""
        scos = []
        
        for item in items:
            identifierref = item.get('identifierref')
            if identifierref and identifierref in resource_map:
                resource = resource_map[identifierref]
                
                # Only include SCOs, not assets
                if resource['scorm_type'] == 'sco':
                    sco_data = {
                        'identifier': item['identifier'],
                        'title': item['title'],
                        'launch_url': resource['href'],
                        'parameters': item.get('parameters', ''),
                        'order': order,
                        'resource_identifier': identifierref
                    }
                    scos.append(sco_data)
                    order += 1
            
            # Process children
            if item.get('children'):
                child_scos = self._extract_scos_from_items(item['children'], resource_map, order)
                scos.extend(child_scos)
                order += len(child_scos)
        
        return scos
