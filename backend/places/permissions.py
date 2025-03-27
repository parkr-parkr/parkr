from rest_framework import permissions
from users.views import PermissionService  

class CanListDrivewayPermission(permissions.BasePermission):
    """
    Permission check for driveway listing capabilities.
    """
    def has_permission(self, request, view):
        # Allow GET requests for everyone (to view listings)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # For POST, PUT, PATCH, DELETE - check if user has permission
        return PermissionService.has_driveway_listing_permission(request.user)

