import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});

const eczaneIcon = new L.Icon({
    iconUrl: '/eczane-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

export default function MapComponent({ konum, eczaneler, tema, setTema }) {
    const tileURL = tema === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    return (
        <>
            {/* Tema Seçimi Sağ Üstte */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                background: 'white',
                padding: '8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
                <button onClick={() => setTema('light')} style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>
                    Açık Tema
                </button>
                <button onClick={() => setTema('dark')} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Koyu Tema
                </button>
            </div>

            <MapContainer center={konum} zoom={13} style={{ height: '100vh', width: '100%' }}>
                <TileLayer
                    url={tileURL}
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                <Marker position={konum}>
                    <Popup>Şu an buradasınız</Popup>
                </Marker>

                {Array.isArray(eczaneler) && eczaneler.map((eczane, index) => (
                    <Marker
                        key={index}
                        position={[eczane.latitude, eczane.longitude]}
                        icon={eczaneIcon}
                    >
                        <Tooltip permanent>{eczane.isim}</Tooltip>
                        <Popup>
                            {eczane.isim}<br />
                            {eczane.adres}<br />
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer">
                                Yol Tarifi Al
                            </a>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </>
    );
}
