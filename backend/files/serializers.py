from rest_framework import serializers
from .models import UploadedFile


class UploadedFileSerializer(serializers.ModelSerializer):
    """Serializer for uploaded files"""
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedFile
        fields = ['id', 'file', 'url', 'file_type', 'original_filename', 
                  'file_size', 'mime_type', 'uploaded_by', 'uploaded_at',
                  'course', 'lesson']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'file_size']
    
    def get_url(self, obj):
        """Get full URL for the file"""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
