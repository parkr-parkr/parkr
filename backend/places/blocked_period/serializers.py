from rest_framework import serializers
from .models import BlockedPeriod

class BlockedPeriodSerializer(serializers.ModelSerializer):
    block_type_display = serializers.CharField(source='get_block_type_display', read_only=True)
    recurring_pattern_display = serializers.CharField(source='get_recurring_pattern_display', read_only=True)
    
    class Meta:
        model = BlockedPeriod
        fields = [
            'id', 'place', 'start_datetime', 'end_datetime', 'block_type', 
            'block_type_display', 'reason', 'is_recurring', 'recurring_pattern',
            'recurring_pattern_display', 'recurring_end_date', 'booking',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Validate that end_datetime is after start_datetime and
        recurring_pattern is provided if is_recurring is True
        """
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError("End time must be after start time")
        
        if data.get('is_recurring') and not data.get('recurring_pattern'):
            raise serializers.ValidationError("Recurring pattern must be provided for recurring blocks")
        
        return data