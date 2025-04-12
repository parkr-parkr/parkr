class LocationParser:
    """
    Utility class for parsing location data.
    """

    @staticmethod
    def parse_location(data):
        """
        Parses latitude and longitude and rounds them to 6 decimal places.
        """
        if 'latitude' in data and data['latitude']:
            data['latitude'] = round(float(data['latitude']), 6)
        if 'longitude' in data and data['longitude']:
            data['longitude'] = round(float(data['longitude']), 6)
        return data
