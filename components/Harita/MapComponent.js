import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import packageJson from '../../package.json';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';



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

// Kullanıcı konumu için özel icon
const userIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDA3YWZmIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});
function KonumaGit({ konum, isMobile }) {
    const map = useMap();

    useEffect(() => {
        if (konum) {
            // Haritayı konum merkeze al ve zoom seviyesini ayarla
            map.setView(konum, 15);

            // Panel yüksekliğini dikkate al ve haritayı yukarı kaydır
            const panelHeight = isMobile ? 45 : 40; // vh
            const panelHeightPx = (panelHeight / 100) * window.innerHeight;

            // Haritayı yukarı kaydır (panel yarısı kadar)
            setTimeout(() => {
                map.panBy([0, -panelHeightPx / 2]);
            }, 0);
        }
    }, [konum, map, isMobile]);

    return null;
}
function HaritayiTumEczanelereFitla({ konum, eczaneler, yakinEczaneler, secilenSehir, secilenIlce, isMobile }) {
    const map = useMap();

    useEffect(() => {
        const kullanilacakEczaneler = (secilenSehir && secilenIlce) ? eczaneler : yakinEczaneler;

        // Eczaneler geldi mi kontrol et
        if (konum && Array.isArray(kullanilacakEczaneler) && kullanilacakEczaneler.length > 0) {
            // Marker ve eczaneleri bounds'a ekle
            const allPoints = [konum, ...kullanilacakEczaneler.map((eczane) => [eczane.latitude, eczane.longitude])];

            // Mobilde daha küçük padding, desktopda daha büyük padding
            const padding = isMobile ? [40, 40] : [80, 80];
            map.fitBounds(allPoints, { padding });
        }
    }, [konum, eczaneler, yakinEczaneler, secilenSehir, secilenIlce, isMobile, map]);

    return null;
}

// Rota göstermek için component
function RoutingComponent({ konum, secilenEczane, setRotaBilgisi }) {
    const map = useMap();
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    useEffect(() => {
        if (!konum || !secilenEczane) {
            // Rota seçimi kaldırıldığında kontrol'ü sil
            if (window.routingControl && map) {
                try {
                    map.removeControl(window.routingControl);
                    window.routingControl = null;
                } catch (e) {
                    // Silme hatası
                }
            }
            setRotaBilgisi?.(null);
            setIsLoadingRoute(false);
            return;
        }

        // Loading başla
        setIsLoadingRoute(true);

        // Dinamik olarak leaflet-routing-machine yükle
        Promise.all([
            import('leaflet-routing-machine'),
            import('leaflet-routing-machine/dist/leaflet-routing-machine.css')
        ]).then(() => {
            // window.L.Routing üzerinden erişim sağla
            if (!window.L.Routing || !map) return;

            // Yeni routing control oluştur
            window.routingControl = window.L.Routing.control({
                waypoints: [
                    window.L.latLng(konum[0], konum[1]),
                    window.L.latLng(secilenEczane.latitude, secilenEczane.longitude)
                ],
                routeWhileDragging: false,
                show: false,
                lineOptions: {
                    styles: [{ color: '#007AFF', weight: 4, opacity: 0.7 }]
                },
                createMarker: () => null,
                addWaypoints: false,
                draggableWaypoints: false,
            }).addTo(map);

            // Rota hesaplandığında event'i dinle
            window.routingControl.on('routesfound', function(e) {
                const route = e.routes[0];
                if (route && route.summary) {
                    const minutes = Math.round(route.summary.totalTime / 60);
                    const distance = (route.summary.totalDistance / 1000).toFixed(2);
                    setRotaBilgisi?.({ minutes, distance });
                }
                setIsLoadingRoute(false);
            });

            window.routingControl.on('routingError', function(e) {
                setRotaBilgisi?.(null);
                setIsLoadingRoute(false);
            });
        }).catch(err => {
            setRotaBilgisi?.(null);
            setIsLoadingRoute(false);
        });

        // Cleanup function
        return () => {
            // Component unmount veya seçim değiştiğinde
            if (window.routingControl && map) {
                try {
                    map.removeControl(window.routingControl);
                    window.routingControl = null;
                } catch (e) {
                    // Silme hatası
                }
            }
        };
    }, [konum, secilenEczane, map, setRotaBilgisi]);

    // Loading polyline return et
    if (!isLoadingRoute || !konum || !secilenEczane) {
        return null;
    }

    return <LoadingRouteLine konum={konum} secilenEczane={secilenEczane} />;
}

// Loading animasyonlu çizgi component'i
function LoadingRouteLine({ konum, secilenEczane }) {
    const map = useMap();
    const [opacity, setOpacity] = useState(0.8);

    // Smooth pulsing efekti (sinüs dalgası)
    useEffect(() => {
        let animationFrameId;
        let time = 0;

        const animate = () => {
            time += 0.02;
            // Sinüs dalgası kullanarak 0.3 ile 0.8 arasında smooth geçiş
            const newOpacity = 0.55 + Math.sin(time) * 0.25;
            setOpacity(newOpacity);
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    useEffect(() => {
        if (!map) return;

        const loadingLine = L.polyline(
            [
                [konum[0], konum[1]],
                [secilenEczane.latitude, secilenEczane.longitude]
            ],
            {
                color: '#FFA500',
                opacity: opacity,
                weight: 3,
                dashArray: '10, 5',
                lineCap: 'round',
                lineJoin: 'round'
            }
        ).addTo(map);

        return () => {
            try {
                if (map && map.hasLayer && map.hasLayer(loadingLine)) {
                    map.removeLayer(loadingLine);
                }
            } catch (e) {
                // Silme hatası - sessiz devam et
            }
        };
    }, [map, konum, secilenEczane, opacity]);

    return null;
}




// Arama barı component'i
function SearchBar({ isMobile, eczanelerData, secilenSehir, setSecilenSehir, secilenIlce, setSecilenIlce, menuOpen, setMenuOpen }) {
    const [searchValue, setSearchValue] = useState('');
    const [searchPanelOpen, setSearchPanelOpen] = useState(false);

    const handleVoiceSearch = () => {
        // Ses arama işlemi
        alert('Ses aramasına tıklandı');
    };

    const handleProfileClick = () => {
        // Profil işlemi
        alert('Profil butonuna tıklandı');
    };

    const sehirler = eczanelerData ? Object.keys(eczanelerData).sort((a, b) => a.localeCompare(b, 'tr')) : [];
    const ilceler = secilenSehir && eczanelerData ? Object.keys(eczanelerData[secilenSehir] || {}).sort((a, b) => a.localeCompare(b, 'tr')) : [];

    return (
        <>
            {/* Menu Overlay */}
            {menuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 9996,
                        animation: 'fadeIn 0.2s ease',
                        cursor: 'pointer',
                    }}
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Menu Sidebar */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                width: isMobile ? '280px' : '320px',
                backgroundColor: '#fff',
                zIndex: 9997,
                boxShadow: menuOpen ? '0 0 16px rgba(0,0,0,0.2)' : 'none',
                transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                overflowY: 'auto',
                padding: '20px',
            }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
                        🏥 Nöbetçi Eczane
                    </h1>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                        Yakınındaki eczaneleri bul
                    </p>
                </div>

                {/* Uygulamanın Bilgisi */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '12px', textTransform: 'uppercase' }}>
                        Hakkında
                    </h2>
                    <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', margin: 0 }}>
                        Nöbetçi Eczane uygulaması, yakınında bulunan eczaneleri hızlıca bulmanıza yardımcı olur. Harita üzerinde görmek için il ve ilçe seçin.
                    </p>
                </div>

                {/* Özellikler */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '12px', textTransform: 'uppercase' }}>
                        Özellikler
                    </h2>
                    <ul style={{ fontSize: '13px', color: '#888', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                        <li>📍 Konumunuzu belirle</li>
                        <li>🗺️ Yakın eczaneleri gör</li>
                        <li>🛣️ Rota bilgisine eriş</li>
                        <li>🌙 Gece modu desteği</li>
                    </ul>
                </div>

                {/* Versiyon */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                        <strong>Versiyon:</strong> {packageJson.version}
                    </p>
                </div>
            </div>

            {/* Arama Barı */}
            <div style={{
                position: 'fixed',
                top: isMobile ? '8px' : '16px',
                left: isMobile ? '8px' : '16px',
                right: isMobile ? '8px' : 'auto',
                width: isMobile ? 'auto' : '360px',
                zIndex: menuOpen ? 9988 : 9998,
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px',
            }}>
                {/* Menu Butonu */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: menuOpen ? '#007AFF' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease',
                        padding: '0',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => !menuOpen && (e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
                    onMouseLeave={(e) => !menuOpen && (e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)')}
                    title="Menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={menuOpen ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                </button>

                {/* Arama Kutusu */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    padding: '0 12px',
                    height: '40px',
                    transition: 'all 0.2s ease',
                }}>
                    {/* Arama İkonu */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>

                    {/* Input */}
                    <input
                        type="text"
                        placeholder="Bir yeri bulun"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onFocus={() => setSearchPanelOpen(true)}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            marginLeft: '8px',
                            marginRight: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            color: '#333',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                        }}
                    />

                    {/* Ses Arama Butonu */}
                    {searchValue === '' && !searchPanelOpen && (
                        <button
                            onClick={handleVoiceSearch}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                transition: 'color 0.2s',
                                padding: '0',
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#666'}
                            onMouseLeave={(e) => e.target.style.color = '#999'}
                            title="Ses arama"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.77 2.36-2.26 0-4.29-.9-5.77-2.36M19 21H5v-2h14v2z"/>
                            </svg>
                        </button>
                    )}

                    {/* Kapat Butonu (Arama Paneli Açık) */}
                    {searchPanelOpen && (
                        <button
                            onClick={() => setSearchPanelOpen(false)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                transition: 'color 0.2s',
                                padding: '0',
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#666'}
                            onMouseLeave={(e) => e.target.style.color = '#999'}
                            title="Kapat"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>

                {!isMobile && (
                    <>
                        {/* Tema Değiştir */}
                        <button
                            onClick={() => {}}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s ease',
                                padding: '0',
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
                            onMouseLeave={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                            title="Katmanlar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>

                        {/* Profil Butonu */}
                        <button
                            onClick={handleProfileClick}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: '#34A853',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s ease',
                                padding: '0',
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
                            onMouseLeave={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                            title="Profil"
                        >
                            A
                        </button>
                    </>
                )}
            </div>

            {/* Arama Paneli */}
            {searchPanelOpen && (
                <>
                    {/* Arkaplan */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: menuOpen ? 0 : 9994,
                            animation: 'fadeIn 0.2s ease',
                            cursor: 'pointer',
                        }}
                        onClick={() => setSearchPanelOpen(false)}
                    />

                    {/* Panel */}
                    <div style={{
                        position: 'fixed',
                        top: isMobile ? '60px' : '72px',
                        left: isMobile ? '8px' : '16px',
                        right: isMobile ? '8px' : 'auto',
                        width: isMobile ? 'auto' : '360px',
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        zIndex: menuOpen ? 0 : 9995,
                        padding: '16px',
                        animation: 'slideDown 0.2s ease',
                    }}>
                        {/* Şehir Seçimi */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                fontSize: '12px',
                                color: '#888',
                                fontWeight: '500',
                                marginBottom: '6px',
                                display: 'block',
                                marginLeft: '4px',
                            }}>
                                📍 Şehir
                            </label>
                            <select
                                value={secilenSehir}
                                onChange={(e) => {
                                    setSecilenSehir(e.target.value);
                                    setSecilenIlce('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    fontSize: '14px',
                                    color: '#333',
                                    boxSizing: 'border-box',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 12px center',
                                    backgroundSize: '16px',
                                    paddingRight: '36px',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            >
                                <option value="">Şehir seç</option>
                                {Array.isArray(sehirler) && sehirler.map(sehir => (
                                    <option key={sehir} value={sehir}>{sehir}</option>
                                ))}
                            </select>
                        </div>

                        {/* İlçe Seçimi */}
                        {secilenSehir && ilceler.length > 0 && (
                            <div>
                                <label style={{
                                    fontSize: '12px',
                                    color: '#888',
                                    fontWeight: '500',
                                    marginBottom: '6px',
                                    display: 'block',
                                    marginLeft: '4px',
                                }}>
                                    🏘️ İlçe
                                </label>
                                <select
                                    value={secilenIlce}
                                    onChange={(e) => setSecilenIlce(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        background: '#fff',
                                        fontSize: '14px',
                                        color: '#333',
                                        boxSizing: 'border-box',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '16px',
                                        paddingRight: '36px',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                                >
                                    <option value="">İlçe seç</option>
                                    {Array.isArray(ilceler) && ilceler.map(ilce => (
                                        <option key={ilce} value={ilce}>{ilce}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }`}
            </style>
        </>
    );
}

export default function MapComponent({ konum, eczaneler, yakinEczaneler, eczanelerData, tema, setTema, secilenSehir, setSecilenSehir, secilenIlce, setSecilenIlce, isMobile, secilenEczane, setSecilenEczane, setRotaBilgisi, rotaBilgisi }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const tileURL = tema === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    if (typeof window === 'undefined') return null;

    return (
        <>
            {/* Arama Barı */}
            <SearchBar
                isMobile={isMobile}
                eczanelerData={eczanelerData}
                secilenSehir={secilenSehir}
                setSecilenSehir={setSecilenSehir}
                secilenIlce={secilenIlce}
                setSecilenIlce={setSecilenIlce}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
            />

            <MapContainer center={konum} zoom={13} style={{ height: '100vh', width: '100%' }} zoomControl={false}>
                <TileLayer
                    url={tileURL}
                    attribution=""
                />
                {/* Kullanıcı konumunu haritada merkeze al */}
                <KonumaGit konum={konum} isMobile={isMobile} />
                {/* Haritayı seçilen eczanelere göre fitle */}
                <HaritayiTumEczanelereFitla
                    konum={konum}
                    eczaneler={eczaneler}
                    yakinEczaneler={yakinEczaneler}
                    secilenSehir={secilenSehir}
                    secilenIlce={secilenIlce}
                    isMobile={isMobile}
                />
                {/* Rota göster */}
                <RoutingComponent konum={konum} secilenEczane={secilenEczane} setRotaBilgisi={setRotaBilgisi} />


                {/* Kullanıcının konumu */}
                <Marker position={konum} icon={userIcon}>
                    <Popup>Şu an buradasınız</Popup>
                </Marker>
                {/* En yakın 5 Eczane Marker'ları */}
                {Array.isArray(yakinEczaneler) && yakinEczaneler.map((eczane, index) => (
                    <Marker
                        key={`yakin-${index}`}
                        position={[eczane.latitude, eczane.longitude]}
                        icon={eczaneIcon}
                        eventHandlers={{
                            click: () => setSecilenEczane(eczane),
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={typeof window !== 'undefined' && window.innerWidth > 768}>
                            🔥 {eczane.isim}
                        </Tooltip>
                    </Marker>
                ))}

                {/* Eczane Marker'ları */}
                {Array.isArray(eczaneler) && eczaneler.map((eczane, index) => (
                    <Marker
                        key={index}
                        position={[eczane.latitude, eczane.longitude]}
                        icon={eczaneIcon}
                        eventHandlers={{
                            click: () => setSecilenEczane(eczane),
                        }}
                    >
                        <Tooltip permanent={typeof window !== 'undefined' && window.innerWidth > 768}>{eczane.isim}</Tooltip>
                    </Marker>
                ))}
            </MapContainer>

            {/* Rota bilgisi göster - Google Maps benzeri */}
            {rotaBilgisi && secilenEczane && (
                <div style={{
                    position: 'fixed',
                    top: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#fff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: menuOpen ? 0 : 9990,
                    fontSize: isMobile ? '13px' : '14px',
                    maxWidth: isMobile ? '85vw' : '400px',
                    textAlign: 'center',
                }}>
                    {/* Kapat Butonu */}
                    <button
                        onClick={() => setSecilenEczane(null)}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '0',
                            width: '24px',
                            height: '24px',
                            color: '#999',
                            lineHeight: '1',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#333'}
                        onMouseLeave={(e) => e.target.style.color = '#999'}
                    >
                        ✕
                    </button>

                    <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: isMobile ? '14px' : '16px', color: '#333' }}>
                        {secilenEczane.isim}
                    </div>

                    {/* Adres bilgisi */}
                    <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#666', marginBottom: '12px' }}>
                        {secilenEczane.adres}
                    </div>

                    {/* Mesafe ve Rota Bilgileri */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '20px' : '30px', color: '#666' }}>
                        {/* Rota Süresi */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', color: '#007AFF' }}>
                                {rotaBilgisi.minutes} dk
                            </div>
                            <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#888', marginTop: '2px' }}>Rota süresi</div>
                        </div>

                        {/* Yol Mesafesi */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', color: '#007AFF' }}>
                                {rotaBilgisi.distance} km
                            </div>
                            <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#888', marginTop: '2px' }}>Yol mesafesi</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
