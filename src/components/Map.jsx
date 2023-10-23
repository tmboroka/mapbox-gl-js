import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios from "axios";

mapboxgl.accessToken =
  "pk.eyJ1IjoidG1ib3Jva2EiLCJhIjoiY2xud3dxeHR5MGZsazJtbXgzYnhiczVmMCJ9.7swFCl9AdMlNhWS-xogq0w";

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(17.91149);
  const [lat, setLat] = useState(47.09327);
  const [zoom, setZoom] = useState(12);
  const markers = useRef([]);
  const defaultTransportationMode = "driving";
  const [transportationMode, setTransportationMode] = useState(
    defaultTransportationMode
  );
  const [cumulativeDistance, setCumulativeDistance] = useState(0);
  const [cumulativeTime, setCumulativeTime] = useState(0);
  const [address, setAddress] = useState("");
  const [addressNotFound, setAddressNotFound] = useState(false);

  const getRoute = async (start, end, mode) => {
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${mode}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const json = await query.json();
    const data = json.routes[0];

    // Draw the route on the map
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
        "line-color": "#FFAD4A",
        "line-width": 8,
      },
    });

    // Update the route info in the state
    const routeDistance = (data.distance / 1000).toFixed(2); // Always display in kilometers
    const routeTime = data.duration; // Time in seconds

    // Accumulate the distance and time
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

    // Remove route layers
    const mapLayers = map.current.getStyle().layers;
    mapLayers.forEach((layer) => {
      if (layer.id.startsWith("route-")) {
        map.current.removeLayer(layer.id);
      }
    });
    setCumulativeDistance(0);
    setCumulativeTime(0);
    setTransportationMode("driving");
    setAddress("")
    setAddressNotFound(false)
  };

  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [lng, lat],
        zoom: zoom,
      });

      const nav = new mapboxgl.NavigationControl();
      map.current.addControl(nav, "top-right");

      map.current.on("move", () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });

      map.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;

        const marker = new mapboxgl.Marker({
          draggable: true,
          color: "#CB4154",
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setLng(lngLat.lng.toFixed(4));
          setLat(lngLat.lat.toFixed(4));
        });

        markers.current.push(marker);

        // Create routes between markers
        for (let i = 0; i < markers.current.length - 1; i++) {
          let mode = transportationMode;
          getRoute(
            markers.current[i].getLngLat().toArray(),
            markers.current[i + 1].getLngLat().toArray(),
            mode
          );
        }
      });
    }
  }, [lng, lat, zoom]);

  const geocodeAddress = async () => {
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${mapboxgl.accessToken}`
      );

      // Check if there are any features (locations) in the response
      if (response.data.features.length > 0) {
        setAddressNotFound(false);
        const coordinates = response.data.features[0].center;

        // Place a marker on the map using the coordinates
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

        // Create routes between markers
        for (let i = 0; i < markers.current.length - 1; i++) {
          let mode = transportationMode;
          getRoute(
            markers.current[i].getLngLat().toArray(),
            markers.current[i + 1].getLngLat().toArray(),
            mode
          );
        }
      } else {
        setAddressNotFound(true);
        console.log("No results found for the entered address.");
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };

  const formatTime = (duration) => {
    if (duration < 3600) {
      // Less than one hour, display in minutes
      const minutes = Math.floor(duration / 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      // One hour or more, display in hours and minutes
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }`;
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

    for (let i = 0; i < markers.current.length - 1; i++) {
      getRoute(
        markers.current[i].getLngLat().toArray(),
        markers.current[i + 1].getLngLat().toArray(),
        mode
      );
    }
  };

  return (
    <div className="container">
      <div className="directions-container">
        <div>
          <input
            type="text"
            placeholder="Enter an address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button onClick={geocodeAddress}>Search</button>
        </div>
        {addressNotFound && (
          <div style={{ color: "red" }}>
            Address not found. Please enter a valid address.
          </div>
        )}
        <div>
          <button
            className={transportationMode === "driving" ? "active" : ""}
            onClick={() => handleTransportationModeChange("driving")}
          >
            Car
          </button>
          <button
            className={transportationMode === "walking" ? "active" : ""}
            onClick={() => handleTransportationModeChange("walking")}
          >
            Walk
          </button>
          <button
            className={transportationMode === "cycling" ? "active" : ""}
            onClick={() => handleTransportationModeChange("cycling")}
          >
            Bike
          </button>
          <button onClick={clearMarkersAndRoutes}>Clear map</button>
        </div>
        <div className="route-info">
          <h2>Route Information</h2>
          <p>Distance: {cumulativeDistance.toFixed(2)} km</p>
          <p>Time: {formatTime(cumulativeTime)}</p>
        </div>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Map;
