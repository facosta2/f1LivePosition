import { useState, useEffect } from 'react';

const useApi = (
    url, 
    endpoint,
    params = {},
    options = {},
    dependencies = [],
    transformResponse = (data) => data
) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    //https://api.openf1.org/v1/drivers?driver_number=1&session_key=9158
    //https://api.openf1.org/v1/location?session_key=9161&driver_number=81&date>2023-09-16T13:03:35.200&date<2023-09-16T13:03:35.800
    const buildUrl = () => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key,value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, value);

            }
        });
        const queryString = queryParams.toString();
         return `${url}${endpoint}${queryString ? `?${queryString}` : ''}`;
        //return `${url}${endpoint}?driver_number=1&session_key=9158`;
    }
    
    // Main Fetc function
    const fetchData = async () => {
        // Verifica parametri richiesti
        const requiredParamsPresent = Object.entries(params).every(
          ([_, value]) => value !== undefined && value !== null
        );
        if (!requiredParamsPresent) return;
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(buildUrl(), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
            ...options,
          });
          
          if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
          }
          
          const responseData = await response.json();
          setData(transformResponse(responseData));
        } catch (err) {
          console.error(`Error on the API call at ${endpoint}:`, err);
          setError(`Impossible to load the data. ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      // Exwecute fetchData on dipendencies cahnges
      useEffect(() => {
        fetchData();
      }, dependencies);
      
      // Return the data and a function to reload the data
      return { data, loading, error, refetch: fetchData };
};

export default useApi;