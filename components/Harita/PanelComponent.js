import { useState, useEffect } from 'react';

export default function PanelComponent({
    panelAcik,
    setPanelAcik,
    eczanelerData,
    secilenSehir,
    setSecilenSehir,
    secilenIlce,
    setSecilenIlce,
    yakinEczaneler,
    ilceler = [],
    isMobile = false,
    secilenEczane = null,
    setSecilenEczane = () => {},
    rotaBilgisi = null
}) {
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchEndY, setTouchEndY] = useState(null);
    const [mouseDownY, setMouseDownY] = useState(null);

    const [eczaneler, setEczaneler] = useState([]);

    // Mobilse 45vh, desktop'ta 40vh
    const [panelHeight, setPanelHeight] = useState(isMobile ? '45vh' : '40vh');


    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
        if (touchStartY === null) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY;

        const currentHeight = parseFloat(panelHeight); // vh olarak
        const vhDelta = (deltaY / window.innerHeight) * 100;

        let newHeight = currentHeight - vhDelta;

        newHeight = Math.max(40, Math.min(newHeight, 90));

        setPanelHeight(`${newHeight}vh`);
        setTouchStartY(currentY); // hareket akıcı devam etsin diye güncelliyoruz
    };





    const handleTouchEnd = () => {
        const numericHeight = parseFloat(panelHeight);
        const breakpoint = isMobile ? 55 : 65;

        // Panel yüksekliği breakpoint'ten azsa → küçük aç (45vh mobil / 40vh desktop)
        // Değilse → tam açık 90 yap
        if (numericHeight <= breakpoint) {
            setPanelHeight(isMobile ? '45vh' : '40vh');
        } else {
            setPanelHeight('90vh');
        }

        setPanelAcik(true); // panel açık sayılmaya devam etsin
        setTouchStartY(null);
    };

    // Mouse drag için handlers
    const handleMouseDown = (e) => {
        setMouseDownY(e.clientY);
    };

    const handleMouseMove = (e) => {
        if (mouseDownY === null) return;

        const currentY = e.clientY;
        const deltaY = currentY - mouseDownY;

        const currentHeight = parseFloat(panelHeight);
        const vhDelta = (deltaY / window.innerHeight) * 100;

        let newHeight = currentHeight - vhDelta;
        newHeight = Math.max(40, Math.min(newHeight, 90));

        setPanelHeight(`${newHeight}vh`);
        setMouseDownY(currentY);
    };

    const handleMouseUp = () => {
        if (mouseDownY === null) return;

        const numericHeight = parseFloat(panelHeight);
        const breakpoint = isMobile ? 55 : 65;

        if (numericHeight <= breakpoint) {
            setPanelHeight(isMobile ? '45vh' : '40vh');
        } else {
            setPanelHeight('90vh');
        }

        setMouseDownY(null);
    };

    useEffect(() => {
        if (mouseDownY !== null) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [mouseDownY, panelHeight]);




    useEffect(() => {
        // İlçe seçildiğinde, zaten alınmış verileden filtrele (API request atmaz!)
        if (secilenSehir && secilenIlce) {
            const eczanes = eczanelerData?.[secilenSehir]?.[secilenIlce];
            setEczaneler(Array.isArray(eczanes) ? eczanes : []);
        } else {
            setEczaneler([]);
        }
    }, [secilenIlce, secilenSehir, eczanelerData]);

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    bottom: panelAcik ? '0' : '-50px',
                    width: '100%',
                    height: panelHeight,
                    transition: 'bottom 0.4s ease',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.95)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Gri Çubuk */}
                <div
                    onClick={() => {
                        const numericHeight = parseFloat(panelHeight);
                        const smallHeight = isMobile ? 45 : 40;
                        if (numericHeight <= 60) {
                            setPanelHeight('90vh');
                        } else {
                            setPanelHeight(`${smallHeight}vh`);
                        }
                        setPanelAcik(true);
                    }}
                    onMouseDown={handleMouseDown}
                    style={{
                        width: isMobile ? '40px' : '50px',
                        height: '4px',
                        background: '#ccc',
                        borderRadius: '10px',
                        cursor: 'grab',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        alignSelf: 'center',
                        marginTop: isMobile ? '6px' : '8px',
                        marginBottom: isMobile ? '10px' : '12px',
                        flexShrink: 0,
                    }}
                />

                {/* Scrollable İçerik */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: isMobile ? '0 10px 16px 10px' : '0 12px 20px 12px'
                }}>

                    {/* En yakın 5 Eczane Listesi */}
                    {(!secilenSehir || !secilenIlce) && yakinEczaneler.length > 0 && (
                        <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                            <h3 style={{ fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 'bold', marginBottom: '8px' }}>
                                Konumunuza göre Size En Yakın Eczaneler
                            </h3>
                            {yakinEczaneler.map((eczane, index) => {
                                const isSelected = secilenEczane?.isim === eczane.isim;
                                return (
                                    <div
                                        key={index}
                                        onClick={() => setSecilenEczane(eczane)}
                                        style={{
                                            marginBottom: isMobile ? '12px' : '16px',
                                            background: isSelected ? '#f0f7ff' : '#fff',
                                            borderRadius: '12px',
                                            padding: isMobile ? '12px' : '14px',
                                            boxShadow: isSelected ? '0 4px 12px rgba(0, 122, 255, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
                                            cursor: 'pointer',
                                            border: isSelected ? '1px solid #007AFF' : '1px solid #eee',
                                            transition: 'all 0.2s ease'
                                        }}>
                                        {/* Header: Adı ve Yıldız */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#222', display: 'block' }}>
                                                    {eczane.isim}
                                                </strong>
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '500', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '6px' }}>
                                                Açık
                                            </span>
                                        </div>

                                        {/* Tür ve Adres */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <span style={{ fontSize: 'clamp(11px, 1.6vw, 12px)', color: '#999' }}>
                                                💊 Nöbetçi Eczane
                                            </span>
                                            <p style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', color: '#666', margin: '4px 0', lineHeight: '1.4' }}>
                                                📍 {eczane.adres}
                                            </p>
                                        </div>

                                        {/* Telefon ve Mesafe */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: 'clamp(11px, 1.6vw, 12px)', color: '#666' }}>
                                            <span>📞 +90 (555) 123-4567</span>
                                            <span>•</span>
                                            <span>📏 {eczane.mesafe.toFixed(2)} km</span>
                                        </div>

                                        {/* Rota Bilgisi */}
                                        {isSelected && rotaBilgisi && (
                                            <div style={{
                                                marginBottom: '10px',
                                                paddingBottom: '10px',
                                                borderBottom: '1px solid #eee',
                                                display: 'flex',
                                                gap: '12px',
                                            }}>
                                                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                        {rotaBilgisi.minutes} dk
                                                    </div>
                                                    <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Rota süresi</div>
                                                </div>
                                                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                        {rotaBilgisi.distance} km
                                                    </div>
                                                    <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Mesafe</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Butonlar */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={`tel:+905551234567`}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    backgroundColor: '#f0f0f0',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: 'clamp(11px, 1.6vw, 12px)',
                                                    fontWeight: '600',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                            >
                                                📞 Ara
                                            </a>
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    backgroundColor: '#007AFF',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: 'clamp(11px, 1.6vw, 12px)',
                                                    fontWeight: '600',
                                                    color: '#fff',
                                                    textDecoration: 'none',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
                                            >
                                                🛣️ Yol Tarifi
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Eczane Listesi */}
                    {Array.isArray(eczaneler) && eczaneler.map((eczane, index) => {
                        const isSelected = secilenEczane?.isim === eczane.isim;
                        return (
                            <div
                                key={index}
                                onClick={() => setSecilenEczane(eczane)}
                                style={{
                                    marginBottom: isMobile ? '12px' : '16px',
                                    background: isSelected ? '#f0f7ff' : '#fff',
                                    borderRadius: '12px',
                                    padding: isMobile ? '12px' : '14px',
                                    boxShadow: isSelected ? '0 4px 12px rgba(0, 122, 255, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
                                    cursor: 'pointer',
                                    border: isSelected ? '1px solid #007AFF' : '1px solid #eee',
                                    transition: 'all 0.2s ease'
                                }}>
                                {/* Header: Adı ve Yıldız */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#222', display: 'block' }}>
                                            {eczane.isim}
                                        </strong>
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '500', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '6px' }}>
                                        Açık
                                    </span>
                                </div>

                                {/* Tür ve Adres */}
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: 'clamp(11px, 1.6vw, 12px)', color: '#999' }}>
                                        💊 Eczane
                                    </span>
                                    <p style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', color: '#666', margin: '4px 0', lineHeight: '1.4' }}>
                                        📍 {eczane.adres}
                                    </p>
                                </div>

                                {/* Telefon ve Mesafe */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: 'clamp(11px, 1.6vw, 12px)', color: '#666' }}>
                                    <span>📞 +90 (555) 123-4567</span>
                                    <span>•</span>
                                    <span>🏪 10 - 21:00</span>
                                </div>

                                {/* Rota Bilgisi */}
                                {isSelected && rotaBilgisi && (
                                    <div style={{
                                        marginBottom: '10px',
                                        paddingBottom: '10px',
                                        borderBottom: '1px solid #eee',
                                        display: 'flex',
                                        gap: '12px',
                                    }}>
                                        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                {rotaBilgisi.minutes} dk
                                            </div>
                                            <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Rota süresi</div>
                                        </div>
                                        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 'clamp(12px, 1.8vw, 13px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                {rotaBilgisi.distance} km
                                            </div>
                                            <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Mesafe</div>
                                        </div>
                                    </div>
                                )}

                                {/* Butonlar */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <a
                                        href={`tel:+905551234567`}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            backgroundColor: '#f0f0f0',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: 'clamp(11px, 1.6vw, 12px)',
                                            fontWeight: '600',
                                            color: '#333',
                                            textDecoration: 'none',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                    >
                                        📞 Ara
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            backgroundColor: '#007AFF',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: 'clamp(11px, 1.6vw, 12px)',
                                            fontWeight: '600',
                                            color: '#fff',
                                            textDecoration: 'none',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
                                    >
                                        🛣️ Yol Tarifi
                                    </a>
                                </div>
                            </div>
                        );
                    })}

                </div>

            </div>
        </>
    );
}
