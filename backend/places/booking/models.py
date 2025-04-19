from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta, datetime

class Booking(models.Model):
    """Model for representing bookings of parking spaces."""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    
    place = models.ForeignKey('places.Place', related_name='bookings', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    booking_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_id = models.CharField(max_length=255, blank=True, null=True)
    payment_status = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['-booking_time']
        app_label = 'places'

    def __str__(self):
        return f"{self.user.email} booked {self.place.name} from {self.start_time} to {self.end_time}"
    
    def clean(self):
        """Validate booking data"""
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")
            
        # Only check availability for new bookings or when changing dates
        if not self.pk or self._state.adding:
            is_available, reason = self.place.is_available(self.start_time, self.end_time)
            if not is_available:
                raise ValidationError(reason)
    
    def save(self, *args, **kwargs):
        """Save the booking and create/update the corresponding BlockedPeriod"""
        self.clean()
        
        # Calculate total price if not set
        if not self.total_price:
            self.total_price = self.calculate_price()
            
        super().save(*args, **kwargs)
        
        # Create or update the corresponding BlockedPeriod
        self._update_blocked_period()
    
    def _update_blocked_period(self):
        """Update or create the blocked period for this booking"""
        from places.blocked_period.models import BlockedPeriod
        if self.status in ['pending', 'confirmed']:
            BlockedPeriod.objects.update_or_create(
                booking=self,
                defaults={
                    'place': self.place,
                    'start_datetime': self.start_time,
                    'end_datetime': self.end_time,
                    'block_type': 'booking',
                    'reason': f"Booked by {self.user.email}",
                    'is_recurring': False,
                }
            )
        else:
            # If cancelled or completed, remove the block
            BlockedPeriod.objects.filter(booking=self).delete()
    
    def cancel(self):
        """Cancel this booking"""
        if self.status == 'cancelled':
            return False, "Booking is already cancelled"
            
        if not self.can_be_cancelled():
            return False, "Booking cannot be cancelled at this time"
            
        self.status = 'cancelled'
        self.save()
        return True, "Booking cancelled successfully"
    
    def complete(self):
        """Mark this booking as completed"""
        if self.status == 'completed':
            return False, "Booking is already completed"
            
        if self.status == 'cancelled':
            return False, "Cannot complete a cancelled booking"
            
        self.status = 'completed'
        self.save()
        return True, "Booking marked as completed"
    
    def confirm(self):
        """Confirm this booking"""
        if self.status != 'pending':
            return False, f"Cannot confirm booking with status '{self.get_status_display()}'"
            
        self.status = 'confirmed'
        self.save()
        return True, "Booking confirmed successfully"
    
    def can_be_cancelled(self):
        """Check if this booking can be cancelled"""
        # Example: Allow cancellation up to 24 hours before start time
        if self.status in ['cancelled', 'completed']:
            return False
            
        return timezone.now() < (self.start_time - timedelta(hours=24))
    
    def get_duration_hours(self):
        """Get the duration of the booking in hours"""
        return (self.end_time - self.start_time).total_seconds() / 3600
    
    def get_cancellation_deadline(self):
        """Get the deadline for cancelling this booking"""
        return self.start_time - timedelta(hours=24)
    
    def calculate_price(self):
        """Calculate the total price for this booking"""
        duration_hours = self.get_duration_hours()
        return self.place.price_per_hour * Decimal(duration_hours)
    
    def is_active(self):
        """Check if this booking is active (not cancelled or completed)"""
        return self.status in ['pending', 'confirmed']
    
    def is_upcoming(self):
        """Check if this booking is in the future"""
        return self.start_time > timezone.now()
    
    def is_in_progress(self):
        """Check if this booking is currently in progress"""
        now = timezone.now()
        return self.start_time <= now and self.end_time > now
    
    def is_past(self):
        """Check if this booking is in the past"""
        return self.end_time <= timezone.now()
    
    def get_status_info(self):
        """Get detailed status information about this booking"""
        status_info = {
            'status': self.status,
            'status_display': self.get_status_display(),
            'is_active': self.is_active(),
            'is_upcoming': self.is_upcoming(),
            'is_in_progress': self.is_in_progress(),
            'is_past': self.is_past(),
            'can_be_cancelled': self.can_be_cancelled(),
            'cancellation_deadline': self.get_cancellation_deadline(),
        }
        return status_info
    
    def update_status(self, new_status):
        """Update the booking status"""
        if new_status not in dict(self.STATUS_CHOICES):
            return False, f"Invalid status: {new_status}"
            
        if new_status == self.status:
            return False, f"Booking is already {self.get_status_display()}"
            
        if new_status == 'cancelled':
            return self.cancel()
        elif new_status == 'completed':
            return self.complete()
        elif new_status == 'confirmed':
            return self.confirm()
        else:
            self.status = new_status
            self.save()
            return True, f"Booking status updated to {self.get_status_display()}"
    
    @classmethod
    def get_user_bookings(cls, user, status=None, upcoming_only=False, past_only=False):
        """
        Get bookings for a specific user with optional filtering
        
        Args:
            user: The user whose bookings to retrieve
            status: Optional status filter
            upcoming_only: If True, only return upcoming bookings
            past_only: If True, only return past bookings
            
        Returns:
            QuerySet of Booking objects
        """
        bookings = cls.objects.filter(user=user)
        
        if status:
            bookings = bookings.filter(status=status)
            
        if upcoming_only:
            bookings = bookings.filter(start_time__gt=timezone.now())
            
        if past_only:
            bookings = bookings.filter(end_time__lte=timezone.now())
            
        return bookings
    
    @classmethod
    def get_place_bookings(cls, place, status=None, upcoming_only=False, past_only=False):
        """
        Get bookings for a specific place with optional filtering
        
        Args:
            place: The place whose bookings to retrieve
            status: Optional status filter
            upcoming_only: If True, only return upcoming bookings
            past_only: If True, only return past bookings
            
        Returns:
            QuerySet of Booking objects
        """
        bookings = cls.objects.filter(place=place)
        
        if status:
            bookings = bookings.filter(status=status)
            
        if upcoming_only:
            bookings = bookings.filter(start_time__gt=timezone.now())
            
        if past_only:
            bookings = bookings.filter(end_time__lte=timezone.now())
            
        return bookings
    
    @classmethod
    def parse_datetime(cls, datetime_str):
        """
        Parse a datetime string with timezone handling
        Returns a datetime object
        """
        if not datetime_str:
            return None
            
        # Handle ISO format with timezone info
        if 'Z' in datetime_str or '+' in datetime_str or '-' in datetime_str:
            # Already has timezone info, just parse it
            return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        else:
            # No timezone info, treat as UTC
            from django.utils import timezone
            import pytz
            
            # Parse as naive datetime then make timezone-aware
            naive_dt = datetime.fromisoformat(datetime_str)
            
            # Make timezone-aware as UTC
            return timezone.make_aware(naive_dt, timezone=pytz.UTC)