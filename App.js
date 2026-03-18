import useApi from "./hooks/useApi";
import { Dimensions, Text, View } from "react-native";
import { useState, useEffect, memo, useMemo } from "react";

const DriverDots = memo(({ positionsArray }) => {
    return (
        <>
            {positionsArray.map(({ driverNum, x, y }) => (
                <View
                    key={driverNum}
                    style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        width: 25,
                        height: 25,
                        borderRadius: 12.5,
                        backgroundColor: "#007bff",
                        justifyContent: "center",
                        alignItems: "center",
                        transform: [{ translateX: -12.5 }, { translateY: -12.5 }]
                    }}
                >
                    <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>
                        {driverNum}
                    </Text>
                </View>
            ))}
        </>
    );
});

export default function App() {

    // Not used as of right onw
    // const {
    //     data: drivers,
    //     loading: loadingDrivers,
    //     error: errorDrivers,
    // } = useApi("https://api.openf1.org/v1/", "starting_grid", {
    //     session_key: "7783",
    // });

    const [drivers_positions, setDriversPositions] = useState({});
    const [allLocations, setAllLocations] = useState([]);
    const [loadingPosition, setLoadingPosition] = useState(false);
    const [errorPosition, setErrorPosition] = useState(null);

    // MOCK DATA
    const STARTING_DATE = new Date("2023-04-01T06:00:00+00:00");
    const INTERVAL = 350; // millisec
    // I calculte the difference between the current time ant the startin time
    // This works as a clock updating the time
    const diffTime = new Date().getTime() - STARTING_DATE.getTime();
    

    // Fetch location data
    const fetchLocations = async () => {
        setLoadingPosition(true);
        try {
            const min_timestamp = new Date().getTime() - diffTime;
            const min_date = formatForOpenF1(new Date(min_timestamp));
            const max_date = formatForOpenF1(new Date(min_timestamp + INTERVAL));
            console.log(`Fetching: ${min_date} to ${max_date}`);
            const response = await fetch(
                `https://api.openf1.org/v1/location?session_key=7783&date>${min_date}&date<${max_date}`
            );
            const data = await response.json();
            setAllLocations(data);
            setErrorPosition(null);
        } catch (err) {
            setErrorPosition(err.message);
        } finally {
            setLoadingPosition(false);
        }
    };

    // Set up polling interval
    useEffect(() => {
        fetchLocations();
        const intervalId = setInterval(fetchLocations, INTERVAL);
        return () => clearInterval(intervalId);
    }, []); 

    useEffect(() => {
        if (allLocations && Array.isArray(allLocations)) {
            const positions = {};
            allLocations.forEach(loc => {
                if (loc.driver_number && loc.x !== undefined && loc.y !== undefined) {
                    positions[loc.driver_number] = {
                        x: loc.x,
                        y: loc.y
                    };
                }
            });
            setDriversPositions(positions);
        }
    }, [allLocations]);

    const positionsEntries = Object.entries(drivers_positions);

    // Container dimensions (in pixels)
    const MARGIN = 50;
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const CONTAINER_WIDTH = dimensions.width - MARGIN;
    const CONTAINER_HEIGHT = dimensions.height - MARGIN;

    // Safe scaling - handle empty data
    const positionsArray = useMemo(() => {
        if (positionsEntries.length === 0) return [];

        const allX = positionsEntries.map(([_, pos]) => pos.x);
        const allY = positionsEntries.map(([_, pos]) => pos.y);

        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        const scaleX = CONTAINER_WIDTH / (maxX - minX || 1);
        const scaleY = CONTAINER_HEIGHT / (maxY - minY || 1);

        return positionsEntries.map(([driverNum, pos]) => {
            const scaledX = (pos.x - minX) * scaleX;
            const scaledY = (pos.y - minY) * scaleY;
            return { driverNum, x: scaledX, y: scaledY };
        });
    }, [positionsEntries, CONTAINER_WIDTH, CONTAINER_HEIGHT]); 

    // not using this to prevent screen flashing
    // if (loadingDrivers || loadingPosition) return <Text>Loading...</Text>;
    if ( errorPosition) return <Text>Error: {errorDrivers?.message || errorPosition?.message}</Text>;

    return (
        <View style={{ flex: 1, padding: (MARGIN/2) }}>
            {/*  Static container - won't re-render */}
            <View style={{
                position: "relative",
                width: CONTAINER_WIDTH,
                height: CONTAINER_HEIGHT,
                borderWidth: 2,
                borderColor: "#ccc",
                backgroundColor: "#f5f5f5",
                marginTop: 20
            }}>
                {/* Only dots re-render when positions change */}
                <DriverDots positionsArray={positionsArray} />
            </View>
        </View>
    );
}

function formatForOpenF1(date) {
    return date.toISOString().replace('.000Z', '+00:00');
}