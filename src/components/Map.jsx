import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken =
  "pk.eyJ1IjoidG1ib3Jva2EiLCJhIjoiY2xud3dxeHR5MGZsazJtbXgzYnhiczVmMCJ9.7swFCl9AdMlNhWS-xogq0w";

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(17.91149);
  const [lat, setLat] = useState(47.09327);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [lng, lat],
        zoom: zoom,
      });

      map.current.on("move", () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });

      map.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;

        const marker = new mapboxgl.Marker({
          draggable: true,
          color: "#306844",
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setLng(lngLat.lng.toFixed(4));
          setLat(lngLat.lat.toFixed(4));
        });
      });
    }
  }, [lng, lat, zoom]);

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Map;
