"""
Tests for SCORM Package Manager

Tests the validation, extraction, and parsing functionality of the
ScormPackageManager class.
"""

import os
import zipfile
import tempfile
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from scorm.package_manager import ScormPackageManager, ValidationResult, ManifestData


class TestScormPackageManager:
    """Test suite for ScormPackageManager"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.manager = ScormPackageManager()
    
    def create_minimal_scorm_12_manifest(self):
        """Create a minimal valid SCORM 1.2 manifest"""
        return b"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test_package_001" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
    </metadata>
    <organizations default="ORG-001">
        <organization identifier="ORG-001">
            <title>Test Course</title>
            <item identifier="ITEM-001" identifierref="RES-001">
                <title>Test Lesson</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="RES-001" type="webcontent" adlcp:scormtype="sco" href="index.html">
            <file href="index.html"/>
        </resource>
    </resources>
</manifest>"""
    
    def create_minimal_scorm_2004_manifest(self):
        """Create a minimal valid SCORM 2004 manifest"""
        return b"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test_package_002" version="2004 4th Edition"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                              http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                              http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                              http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>2004 4th Edition</schemaversion>
    </metadata>
    <organizations default="ORG-001">
        <organization identifier="ORG-001">
            <title>Test Course 2004</title>
            <item identifier="ITEM-001" identifierref="RES-001">
                <title>Test Lesson 2004</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="RES-001" type="webcontent" adlcp:scormType="sco" href="index.html">
            <file href="index.html"/>
        </resource>
    </resources>
</manifest>"""
    
    def create_scorm_package_zip(self, manifest_content, include_content=True):
        """Create a SCORM package ZIP file in memory"""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add manifest
            zf.writestr('imsmanifest.xml', manifest_content)
            
            # Add content file if requested
            if include_content:
                zf.writestr('index.html', b'<html><body>Test Content</body></html>')
        
        zip_buffer.seek(0)
        return zip_buffer
    
    def test_validate_package_valid_scorm_12(self):
        """Test validation of a valid SCORM 1.2 package"""
        manifest = self.create_minimal_scorm_12_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest)
        
        uploaded_file = SimpleUploadedFile(
            "test_package.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        result = self.manager.validate_package(uploaded_file)
        
        assert result.is_valid is True
        assert len(result.errors) == 0
    
    def test_validate_package_valid_scorm_2004(self):
        """Test validation of a valid SCORM 2004 package"""
        manifest = self.create_minimal_scorm_2004_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest)
        
        uploaded_file = SimpleUploadedFile(
            "test_package_2004.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        result = self.manager.validate_package(uploaded_file)
        
        assert result.is_valid is True
        assert len(result.errors) == 0
    
    def test_validate_package_missing_manifest(self):
        """Test validation fails when manifest is missing"""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('index.html', b'<html><body>Test</body></html>')
        
        zip_buffer.seek(0)
        uploaded_file = SimpleUploadedFile(
            "no_manifest.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        result = self.manager.validate_package(uploaded_file)
        
        assert result.is_valid is False
        assert any('imsmanifest.xml not found' in error for error in result.errors)
    
    def test_validate_package_invalid_xml(self):
        """Test validation fails with invalid XML in manifest"""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('imsmanifest.xml', b'<invalid><xml>')
        
        zip_buffer.seek(0)
        uploaded_file = SimpleUploadedFile(
            "invalid_xml.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        result = self.manager.validate_package(uploaded_file)
        
        assert result.is_valid is False
        assert any('Invalid XML' in error for error in result.errors)
    
    def test_validate_package_not_a_zip(self):
        """Test validation fails when file is not a ZIP"""
        uploaded_file = SimpleUploadedFile(
            "not_a_zip.txt",
            b"This is just text, not a ZIP file",
            content_type="text/plain"
        )
        
        result = self.manager.validate_package(uploaded_file)
        
        assert result.is_valid is False
        assert any('not a valid ZIP' in error for error in result.errors)
    
    def test_validate_package_too_large(self):
        """Test validation fails when package exceeds size limit"""
        # Create a manager with very small size limit
        small_manager = ScormPackageManager(max_package_size=100)
        
        manifest = self.create_minimal_scorm_12_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest)
        
        uploaded_file = SimpleUploadedFile(
            "large_package.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        result = small_manager.validate_package(uploaded_file)
        
        assert result.is_valid is False
        assert any('exceeds maximum' in error for error in result.errors)
    
    def test_extract_manifest_scorm_12(self):
        """Test extracting manifest data from SCORM 1.2 package"""
        manifest = self.create_minimal_scorm_12_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest)
        
        uploaded_file = SimpleUploadedFile(
            "test_package.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        manifest_data = self.manager.extract_manifest(uploaded_file)
        
        assert isinstance(manifest_data, ManifestData)
        assert manifest_data.identifier == "test_package_001"
        assert manifest_data.version == "1.2"
        assert manifest_data.title == "Test Course"
        assert len(manifest_data.organizations) > 0
        assert len(manifest_data.resources) > 0
        assert len(manifest_data.scos) > 0
    
    def test_extract_manifest_scorm_2004(self):
        """Test extracting manifest data from SCORM 2004 package"""
        manifest = self.create_minimal_scorm_2004_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest)
        
        uploaded_file = SimpleUploadedFile(
            "test_package_2004.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        manifest_data = self.manager.extract_manifest(uploaded_file)
        
        assert isinstance(manifest_data, ManifestData)
        assert manifest_data.identifier == "test_package_002"
        assert manifest_data.version == "2004"
        assert manifest_data.title == "Test Course 2004"
        assert len(manifest_data.scos) > 0
        
        # Check SCO data
        sco = manifest_data.scos[0]
        assert sco['title'] == "Test Lesson 2004"
        assert sco['launch_url'] == "index.html"
    
    def test_extract_manifest_missing_manifest(self):
        """Test extract_manifest raises error when manifest is missing"""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('index.html', b'<html><body>Test</body></html>')
        
        zip_buffer.seek(0)
        uploaded_file = SimpleUploadedFile(
            "no_manifest.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        with pytest.raises(ValueError, match="imsmanifest.xml not found"):
            self.manager.extract_manifest(uploaded_file)
    
    def test_extract_content(self):
        """Test extracting content files from package"""
        manifest = self.create_minimal_scorm_12_manifest()
        zip_buffer = self.create_scorm_package_zip(manifest, include_content=True)
        
        uploaded_file = SimpleUploadedFile(
            "test_package.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        # Use a temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract to temp directory (relative path)
            destination = os.path.basename(temp_dir)
            
            # Mock MEDIA_ROOT for testing
            import scorm.package_manager as pm_module
            original_media_root = getattr(pm_module.settings, 'MEDIA_ROOT', None)
            pm_module.settings.MEDIA_ROOT = os.path.dirname(temp_dir)
            
            try:
                extracted_files = self.manager.extract_content(uploaded_file, destination)
                
                # Verify files were extracted
                assert len(extracted_files) > 0
                assert 'imsmanifest.xml' in extracted_files
                assert 'index.html' in extracted_files
                
                # Verify files exist on disk
                full_path = os.path.join(os.path.dirname(temp_dir), destination)
                assert os.path.exists(os.path.join(full_path, 'imsmanifest.xml'))
                assert os.path.exists(os.path.join(full_path, 'index.html'))
            finally:
                # Restore original MEDIA_ROOT
                if original_media_root:
                    pm_module.settings.MEDIA_ROOT = original_media_root
    
    def test_extract_content_corrupted_zip(self):
        """Test extract_content raises error for corrupted ZIP"""
        uploaded_file = SimpleUploadedFile(
            "corrupted.zip",
            b"This is not a valid ZIP file",
            content_type="application/zip"
        )
        
        with pytest.raises(ValueError, match="Invalid or corrupted ZIP"):
            self.manager.extract_content(uploaded_file, "test_dest")
    
    def test_sco_extraction_with_multiple_scos(self):
        """Test extracting multiple SCOs from manifest"""
        manifest = b"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="multi_sco_package" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <organizations default="ORG-001">
        <organization identifier="ORG-001">
            <title>Multi-SCO Course</title>
            <item identifier="ITEM-001" identifierref="RES-001">
                <title>Lesson 1</title>
            </item>
            <item identifier="ITEM-002" identifierref="RES-002">
                <title>Lesson 2</title>
            </item>
            <item identifier="ITEM-003" identifierref="RES-003">
                <title>Lesson 3</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="RES-001" type="webcontent" adlcp:scormtype="sco" href="lesson1.html">
            <file href="lesson1.html"/>
        </resource>
        <resource identifier="RES-002" type="webcontent" adlcp:scormtype="sco" href="lesson2.html">
            <file href="lesson2.html"/>
        </resource>
        <resource identifier="RES-003" type="webcontent" adlcp:scormtype="sco" href="lesson3.html">
            <file href="lesson3.html"/>
        </resource>
    </resources>
</manifest>"""
        
        zip_buffer = self.create_scorm_package_zip(manifest)
        uploaded_file = SimpleUploadedFile(
            "multi_sco.zip",
            zip_buffer.read(),
            content_type="application/zip"
        )
        
        manifest_data = self.manager.extract_manifest(uploaded_file)
        
        assert len(manifest_data.scos) == 3
        assert manifest_data.scos[0]['title'] == "Lesson 1"
        assert manifest_data.scos[1]['title'] == "Lesson 2"
        assert manifest_data.scos[2]['title'] == "Lesson 3"
        assert manifest_data.scos[0]['launch_url'] == "lesson1.html"
        assert manifest_data.scos[1]['launch_url'] == "lesson2.html"
        assert manifest_data.scos[2]['launch_url'] == "lesson3.html"
