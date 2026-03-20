/**
 * Change date format to respect openF1 api format
 * @param {*} date date to pass to the api
 * @returns date formatted with openF1 standard
 */
export function formatForOpenF1(date) {
    return date.toISOString().replace('.000Z', '+00:00');
}

/**
 * Get the colour of the driver to display
 * @param {*} num number of the driver
 * @param {*} driversColours dictionary of {driver_number, team_colour}
 * @returns hexadecimal colour of the driver
 */
export const getDriverColour = (num, driversColours) => {
        // Search for specific driver
        const driverData = driversColours.find(d => String(d.driverNum) === String(num));

        // Taking the colour of the driver in hexadecimal
        return driverData ? driverData.team_colour : "#007bff"; 
    };