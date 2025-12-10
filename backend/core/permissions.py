"""
Custom permissions for core app.
"""
from rest_framework import permissions


class IsInstructor(permissions.BasePermission):
    """
    Permission to allow only instructors to access the view.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_instructor
        )


class IsStudent(permissions.BasePermission):
    """
    Permission to allow only students to access the view.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_student
        )


class IsOwner(permissions.BasePermission):
    """
    Permission to allow only the owner of an object to access it.
    """
    def has_object_permission(self, request, view, obj):
        return obj == request.user or (hasattr(obj, 'user') and obj.user == request.user)
