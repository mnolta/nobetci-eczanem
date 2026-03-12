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
                                            background: isSelected ? '#e3f2fd' : '#fff',
                                            borderRadius: '10px',
                                            padding: isMobile ? '8px' : '10px',
                                            marginBottom: isMobile ? '8px' : '10px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                            cursor: 'pointer',
                                            border: isSelected ? '2px solid #007AFF' : 'none',
                                            transition: 'all 0.2s ease'
                                        }}>
                                        <strong style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#333' }}>{eczane.isim}</strong><br />
                                        <span style={{ fontSize: 'clamp(12px, 2vw, 14px)', color: '#666' }}>{eczane.adres}</span><br />
                                        <span style={{ fontSize: 'clamp(11px, 1.8vw, 12px)', color: '#888' }}>{eczane.mesafe.toFixed(2)} km yakınınızda</span>

                                        {/* Rota bilgisini göster */}
                                        {isSelected && rotaBilgisi && (
                                            <div style={{
                                                marginTop: '8px',
                                                paddingTop: '8px',
                                                borderTop: '1px solid #ddd',
                                                display: 'flex',
                                                gap: '16px',
                                                justifyContent: 'space-around'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                        {rotaBilgisi.minutes} dk
                                                    </div>
                                                    <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Rota süresi</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                        {rotaBilgisi.distance} km
                                                    </div>
                                                    <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Yol mesafesi</div>
                                                </div>
                                            </div>
                                        )}

                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'underline', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                                            Yol Tarifi Al
                                        </a>
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
                                    marginBottom: isMobile ? '8px' : '15px',
                                    background: isSelected ? '#e3f2fd' : '#fff',
                                    borderRadius: '10px',
                                    padding: isMobile ? '8px' : '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid #007AFF' : 'none',
                                    transition: 'all 0.2s ease'
                                }}>
                                <strong style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#333' }}>{eczane.isim}</strong><br />
                                <span style={{ fontSize: 'clamp(12px, 2vw, 14px)', color: '#666' }}>{eczane.adres}</span>

                                {/* Rota bilgisini göster */}
                                {isSelected && rotaBilgisi && (
                                    <div style={{
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #ddd',
                                        display: 'flex',
                                        gap: '16px',
                                        justifyContent: 'space-around'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                {rotaBilgisi.minutes} dk
                                            </div>
                                            <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Rota süresi</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 'bold', color: '#007AFF' }}>
                                                {rotaBilgisi.distance} km
                                            </div>
                                            <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: '#888', marginTop: '2px' }}>Yol mesafesi</div>
                                        </div>
                                    </div>
                                )}<br />
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'clamp(12px, 2vw, 14px)', color: '#0070f3', textDecoration: 'underline' }}>
                                    Yol Tarifi Al
                                </a>
                            </div>
                        );
                    })}

                </div>

            </div>
        </>
    );
}
