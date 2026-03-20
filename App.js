import useApi from "./hooks/useApi";
import { Dimensions, Text, View } from "react-native";
import { useState, useEffect, memo, useMemo } from "react";
import trackCoordinates from './tracks/melbourn';
import { Svg, Path } from 'react-native-svg';

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

    // Not used as of right now, useful for getting drivers colors
    // const {
    //     data: drivers,
    //     loading: loadingDrivers,
    //     error: errorDrivers,
    // } = useApi("https://api.openf1.org/v1/", "starting_grid", {
    //     session_key: "7783",
    // });

    const [drivers_positions, setDriversPositions] = useState({});
    const [allLocations, setAllLocations] = useState([]);
    // const [loadingPosition, setLoadingPosition] = useState(false);
    const [errorPosition, setErrorPosition] = useState(null);

    // MOCK DATA
    const STARTING_DATE = new Date("2023-04-01T06:00:00+00:00");
    const INTERVAL = 2000; // millisec
    // I calculte the difference between the current time ant the startin time
    // This works as a clock updating the time
    const diffTime = new Date().getTime() - STARTING_DATE.getTime();
    

    // Fetch location data
    const fetchLocations = async () => {
        // setLoadingPosition(true);
        try {
            const min_timestamp = new Date().getTime() - diffTime;
            const min_date = formatForOpenF1(new Date(min_timestamp));
            const max_date = formatForOpenF1(new Date(min_timestamp + INTERVAL));
            // console.log(`Fetching: ${min_date} to ${max_date}`);
            const response = await fetch(
                `https://api.openf1.org/v1/location?session_key=7783&date>${min_date}&date<${max_date}`
            );
            const data = await response.json();
            setAllLocations(data);
            setErrorPosition(null);
        } catch (err) {
            setErrorPosition(err.message);
        } finally {
            // setLoadingPosition(false);
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
    const trackPoints = trackCoordinates.map(c => ({ x: c.x, y: c.y }));
    const driverPoints = positionsEntries.length > 0 
        ? positionsEntries.map(([_, pos]) => ({ x: pos.x, y: pos.y }))
        : [];

    const allPoints = [...trackPoints, ...driverPoints];

    let globalMinX = Infinity, globalMaxX = -Infinity;
    let globalMinY = Infinity, globalMaxY = -Infinity;

    if (allPoints.length > 0) {
    globalMinX = Math.min(...allPoints.map(p => p.x));
    globalMaxX = Math.max(...allPoints.map(p => p.x));
    globalMinY = Math.min(...allPoints.map(p => p.y));
    globalMaxY = Math.max(...allPoints.map(p => p.y));
    }

    const globalWidth = globalMaxX - globalMinX || 1;
    const globalHeight = globalMaxY - globalMinY || 1;

    const scaleX = CONTAINER_WIDTH / globalWidth;
    const scaleY = CONTAINER_HEIGHT / globalHeight;
    const scale = Math.min(scaleX, scaleY)

    const centerX = (globalMinX + globalMaxX) / 2;
    const centerY = (globalMinY + globalMaxY) / 2;

    const transformPoint = (x, y) => {
    const scaledX = (x - centerX) * scale + (CONTAINER_WIDTH / 2);
    const scaledY = (y - centerY) * scale + (CONTAINER_HEIGHT / 2);
    return { x: scaledX, y: scaledY };
    };
 
    const positionsArray = useMemo(() => {
    return driverPoints.map(({ x, y }, index) => {
        const { x: sx, y: sy } = transformPoint(x, y);
        return {
        driverNum: positionsEntries[index][0], // Get driver number from original entry
        x: sx,
        y: sy
        };
    });
    }, [driverPoints, scale, centerX, centerY, CONTAINER_WIDTH, CONTAINER_HEIGHT]);

    const trackPathData = useMemo(() => {
    if (trackPoints.length === 0) return '';
    
    return trackPoints.map((coord, i) => {
        const { x, y } = transformPoint(coord.x, coord.y);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
    }, [trackPoints, scale, centerX, centerY, CONTAINER_WIDTH, CONTAINER_HEIGHT]);

    // not using this to prevent screen flashing
    // if (loadingDrivers || loadingPosition) return <Text>Loading...</Text>;
    if ( errorPosition) return <Text>Error: {errorDrivers?.message || errorPosition?.message}</Text>;

    return (
        <View style={{ flex: 1, padding: (MARGIN/2) }}>
            {/*  Static container - won't re-render */}
            <View style={{ position: "relative", width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}>
                <Svg width={CONTAINER_WIDTH} height={CONTAINER_HEIGHT}>
                    <Path
                    d={trackPathData}
                    stroke="#333"
                    strokeWidth={4}
                    fill="none"
                    opacity={0.4}
                    />
                </Svg>
                <DriverDots positionsArray={positionsArray} />
            </View>
        </View>
    );
}

function formatForOpenF1(date) {
    return date.toISOString().replace('.000Z', '+00:00');
}