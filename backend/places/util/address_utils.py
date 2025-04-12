class AddressParser:
    """
    Utility class for parsing and filling address data.
    """

    @staticmethod
    def parse_address(address_string):
        """
        Parses an address string into its components (address, city, state, zip_code).
        """
        parts = address_string.split(',')
        address = None
        city = None
        state = None
        zip_code = None

        if len(parts) >= 3:
            address = parts[0].strip()
            city = parts[1].strip()
            state_zip = parts[2].strip().split(' ')
            if len(state_zip) >= 2:
                state = state_zip[0].strip()
                zip_code = state_zip[1].strip()

        return address, city, state, zip_code

    @staticmethod
    def fill_address_data(data):
        """Fills in the address, city, state, and zip code from the address string."""
        # Parse the address into components
        address_string = data.get('address', '')
        address, city, state, zip_code = AddressParser.parse_address(address_string)

        # Update the data dictionary with the parsed values
        data['address'] = address
        data['city'] = city
        data['state'] = state
        data['zip_code'] = zip_code
