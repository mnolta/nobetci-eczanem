import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
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
function KonumaGit({ konum }) {
    const map = useMap();

    useEffect(() => {
        if (konum) {
            map.setView(konum, 14); // 14 veya 15 gibi zoom değeri uygun
        }
    }, [konum]);

    return null;
}
function HaritayiTumEczanelereFitla({ eczaneler, yakinEczaneler, secilenSehir, secilenIlce }) {
    const map = useMap();

    useEffect(() => {
        const kullanilacakEczaneler = (secilenSehir && secilenIlce) ? eczaneler : yakinEczaneler;

        if (kullanilacakEczaneler && kullanilacakEczaneler.length > 0) {
            const bounds = kullanilacakEczaneler.map((eczane) => [eczane.latitude, eczane.longitude]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [eczaneler, yakinEczaneler, secilenSehir, secilenIlce]);

    return null;
}



export default function MapComponent({ konum, eczaneler, yakinEczaneler, tema, setTema, secilenSehir, secilenIlce }) {
    const tileURL = tema === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    if (typeof window === 'undefined') return null;

    return (
        <>



            <MapContainer center={konum} zoom={13} style={{ height: '100vh', width: '100%' }}>
                <TileLayer
                    url={tileURL}
                    attribution=""
                />
                {/* Kullanıcı konumunu haritada merkeze al */}
                <KonumaGit konum={konum} />
                {/* Haritayı seçilen eczanelere göre fitle */}
                <HaritayiTumEczanelereFitla
                    eczaneler={eczaneler}
                    yakinEczaneler={yakinEczaneler}
                    secilenSehir={secilenSehir}
                    secilenIlce={secilenIlce}
                />


                {/* Kullanıcının konumu */}
                <Marker position={konum}>
                    <Popup>Şu an buradasınız</Popup>
                </Marker>
                {/* En yakın 5 Eczane Marker'ları */}
                {Array.isArray(yakinEczaneler) && yakinEczaneler.map((eczane, index) => (
                    <Marker
                        key={`yakin-${index}`}
                        position={[eczane.latitude, eczane.longitude]}
                        icon={eczaneIcon} // istersen özel başka bir icon tanımlarız
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                            🔥 {eczane.isim}
                        </Tooltip>
                        <Popup>
                            <strong>{eczane.isim}</strong><br />
                            {eczane.adres}<br />
                            {eczane.mesafe.toFixed(2)} km yakınınızda<br />
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer">
                                Yol Tarifi Al
                            </a>
                        </Popup>
                    </Marker>
                ))}

                {/* Eczane Marker'ları */}
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
