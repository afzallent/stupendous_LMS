from rest_framework import permissions


class IsInstructor(permissions.BasePermission):
    """
    Permission to allow only instructors to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_instructor
