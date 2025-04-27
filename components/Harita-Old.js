import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import L from 'leaflet';

// Leaflet varsayılan marker ikon düzeltmesi
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});


// Eczane özel ikonu
const eczaneIcon = new L.Icon({
    iconUrl: '/eczane-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

function Harita({ konum, eczaneler }) {
    const [tema, setTema] = useState('light');
    const [panelAcik, setPanelAcik] = useState(true);
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchEndY, setTouchEndY] = useState(null);

    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
        setTouchEndY(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
        if (touchStartY && touchEndY) {
            const fark = touchEndY - touchStartY;
            if (fark > 50) { // Aşağı doğru sürüklediyse
                setPanelAcik(false);
            } else if (fark < -50) { // Yukarı doğru sürüklediyse
                setPanelAcik(true);
            }
        }
        setTouchStartY(null);
        setTouchEndY(null);
    };



    const tileURL = tema === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
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

            {/* Harita */}
            <MapContainer center={konum} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url={tileURL}
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                <Marker position={konum}>
                    <Popup>Şu an buradasınız</Popup>
                </Marker>

                {eczaneler.map((eczane, index) => (
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

            {/* Panel (Alt Kart) */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    position: 'absolute',
                    bottom: panelAcik ? '0' : '-45vh',
                    width: '100%',
                    background: 'rgba(255,255,255,0.95)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    height: '45vh',
                    transition: 'bottom 0.4s ease',
                    zIndex: 999,
                    overflowY: 'auto',
                    padding: '20px',
                    paddingTop: '50px' // Üstte çubuğa yer bırakıyoruz
                }}
            >

                {/* Sabit Gri Çubuk */}
                <div
                    onClick={() => setPanelAcik(!panelAcik)}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '40px',
                        height: '5px',
                        background: '#999',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        zIndex: 1000
                    }}
                />
                {/* Panel İçeriği */}
                <h3 style={{ marginTop: '0px' }}>Yakındaki Nöbetçi Eczaneler</h3>

                {eczaneler.map((eczane, index) => (
                    <div key={index} style={{ marginBottom: '15px' }}>
                        <strong>{eczane.isim}</strong><br />
                        {eczane.adres}<br />
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer">
                            Haritada Göster
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Harita;
