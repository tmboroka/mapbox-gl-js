import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken =
  "pk.eyJ1IjoidG1ib3Jva2EiLCJhIjoiY2xud3dxeHR5MGZsazJtbXgzYnhiczVmMCJ9.7swFCl9AdMlNhWS-xogq0w";

const Map = () => {
  //initalize the default variables
  const lngOfVeszprem = 17.91149;
  const latOfVeszprem = 47.09327;
  const defaultZoom = 12;
  const defaultTransportationMode = "driving";
  const roadWidth = 8;
  const roadColor = "#FFAD4A";

  //initialize map
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  //states
  const [lng, setLng] = useState(lngOfVeszprem);
  const [lat, setLat] = useState(latOfVeszprem);
  const [zoom, setZoom] = useState(defaultZoom);
  const [transportationMode, setTransportationMode] = useState(
    defaultTransportationMode
  );
  const [cumulativeDistance, setCumulativeDistance] = useState(0);
  const [cumulativeTime, setCumulativeTime] = useState(0);
  const [address, setAddress] = useState("");
  const [addressNotFound, setAddressNotFound] = useState(false);

  useEffect(() => {
    if (!map.current) {
      map.current = createMap();

      map.current.on("move", moveMap(map.current));

      map.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;

        createMarker({ lng, lat });

        drawRoute(markers.current);
      });
    }
  }, []);

  const createMap = () => {
    return new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [lng, lat],
      zoom: zoom,
    });
  };

  const moveMap = (map) => {
    setLng(map.getCenter().lng.toFixed(4));
    setLat(map.getCenter().lat.toFixed(4));
    setZoom(map.getZoom().toFixed(2));
  };

  const createMarker = (coordinates) => {
    const marker = new mapboxgl.Marker({
      draggable: true,
      color: "#CB4154",
    })
      .setLngLat(coordinates)
      .addTo(map.current);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      setLng(lngLat.lng.toFixed(4));
      setLat(lngLat.lat.toFixed(4));
    });

    markers.current.push(marker);
    return marker;
  };

  const drawRoute = (markers) => {
    if (markers.length > 1) {
      let lastIndex = markers.length - 1;
      let mode = transportationMode;
      getRoute(
        markers[lastIndex].getLngLat().toArray(),
        markers[lastIndex - 1].getLngLat().toArray(),
        mode
      );
    }
  };

  const getRoute = async (start, end, mode) => {
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${mode}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const json = await query.json();
    const data = json.routes[0];

    map.current.addLayer({
      id: `route-${mode}-${start.join("-")}`,
      type: "line",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: data.geometry,
        },
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": roadColor,
        "line-width": roadWidth,
      },
    });

    const routeDistance = (data.distance / 1000).toFixed(2);
    const routeTime = data.duration;

    setCumulativeDistance(
      (prevDistance) => prevDistance + parseFloat(routeDistance)
    );
    setCumulativeTime((prevTime) => prevTime + routeTime);
  };

  const clearMarkersAndRoutes = () => {
    markers.current.forEach((marker) => {
      marker.remove();
    });
    markers.current = [];

    const mapLayers = map.current.getStyle().layers;
    mapLayers.forEach((layer) => {
      if (layer.id.startsWith("route-")) {
        map.current.removeLayer(layer.id);
      }
    });
    setCumulativeDistance(0);
    setCumulativeTime(0);
    setTransportationMode("driving");
    setAddress("");
    setAddressNotFound(false);
  };

  const geocodeAddress = async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.features.length > 0) {
        setAddressNotFound(false);
        const coordinates = data.features[0].center;

        createMarker(coordinates);
        setAddress("");

        drawRoute(markers.current)
      } else {
        setAddressNotFound(true);
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };

  

  const handleTransportationModeChange = (mode) => {
    setTransportationMode(mode);
    const mapLayers = map.current.getStyle().layers;
    mapLayers.forEach((layer) => {
      if (layer.id.startsWith("route-")) {
        map.current.removeLayer(layer.id);
      }
    });

    setCumulativeDistance(0);
    setCumulativeTime(0);

    for (let i = 0; i < markers.current.length - 1; i++) {
      getRoute(
        markers.current[i].getLngLat().toArray(),
        markers.current[i + 1].getLngLat().toArray(),
        mode
      );
    }
  };
  
  const formatTime = (duration) => {
    if (duration < 3600) {
      const minutes = Math.floor(duration / 60);
      return `${minutes} MINUTE${minutes !== 1 ? "S" : ""}`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours} HOUR${hours !== 1 ? "S" : ""} ${minutes} MINUTE${
        minutes !== 1 ? "S" : ""
      }`;
    }
  };

  return (
    <div className="container">
      <div className="directions-container">
        <div className="input-container">
          <div className="text-input-container">
            <input
              type="text"
              className="text-input"
              placeholder="ENTER AN ADDRESS"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button onClick={geocodeAddress}>SEARCH</button>
          </div>
          {addressNotFound && (
            <div style={{ color: "red" }}>
              Address not found. Please enter a valid address.
            </div>
          )}
        </div>
        <div className="button-container">
          <button
            className={transportationMode === "driving" ? "active" : ""}
            onClick={() => handleTransportationModeChange("driving")}
          >
            CAR
          </button>
          <button
            className={transportationMode === "walking" ? "active" : ""}
            onClick={() => handleTransportationModeChange("walking")}
          >
            WALK
          </button>
          <button
            className={transportationMode === "cycling" ? "active" : ""}
            onClick={() => handleTransportationModeChange("cycling")}
          >
            BIKE
          </button>
        </div>
        <div className="route-info">
          <h2>ROUTE INFORMATION</h2>
          <p>DISTANCE: {cumulativeDistance.toFixed(2)} KM</p>
          <p>TIME: {formatTime(cumulativeTime)}</p>
        </div>
        <button onClick={clearMarkersAndRoutes}>CLEAR MAP</button>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Map;
