from django.contrib import admin
from .models import XAPIStatement, XAPIAttachment, XAPIVerb, XAPIActivityType


@admin.register(XAPIStatement)
class XAPIStatementAdmin(admin.ModelAdmin):
    list_display = ('statement_id', 'actor_name', 'get_verb_display', 'object_id', 'timestamp', 'voided')
    list_filter = ('voided', 'timestamp', 'verb_id')
    search_fields = ('actor_name', 'actor_mbox', 'object_id', 'statement_id')
    readonly_fields = ('statement_id', 'stored')
    date_hierarchy = 'timestamp'
    
    def get_verb_display(self, obj):
        return obj.verb_display.get('en-US', 'unknown')
    get_verb_display.short_description = 'Verb'


@admin.register(XAPIAttachment)
class XAPIAttachmentAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'statement', 'content_type', 'length')
    list_filter = ('content_type',)
    search_fields = ('statement__statement_id', 'usage_type')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', 'Attachment')
    get_display_name.short_description = 'Display Name'


@admin.register(XAPIVerb)
class XAPIVerbAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'iri', 'description')
    search_fields = ('iri', 'description')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', obj.iri)
    get_display_name.short_description = 'Display Name'


@admin.register(XAPIActivityType)
class XAPIActivityTypeAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'iri', 'description')
    search_fields = ('iri', 'description')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', obj.iri)
    get_display_name.short_description = 'Display Name'
