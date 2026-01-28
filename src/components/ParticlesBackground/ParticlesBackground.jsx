// src/components/ParticlesBackground/ParticlesBackground.jsx
import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadStarsPreset } from "@tsparticles/preset-stars";

const ParticlesBackground = () => {
    
    // ... (Mantenemos los callbacks sin cambios)
    const particlesInit = useCallback(async (engine) => {
        await loadStarsPreset(engine);
    }, []);
    const particlesLoaded = useCallback(async (container) => {}, []);

    const options = {
        preset: "stars", 
        background: {
            color: {
                // ¡COLOR DE PRUEBA EXTREMO! Si ves este color, las partículas están cargando.
                value: "#ff00ff", // Magenta brillante
            },
        },
        particles: {
            number: { value: 80 },
            color: { value: "#ffffff" }, // Partículas blancas
            opacity: { value: 0.5, random: true },
            size: { value: 1.5 },
            move: { enable: true, speed: 0.2, direction: "none", random: true, straight: false, out_mode: "out" },
        },
        interactivity: {
            events: { onHover: { enable: false }, onClick: { enable: false } },
        },
    };

    return (
        <Particles
            id="tsparticles"
            init={particlesInit}
            loaded={particlesLoaded}
            options={options}
            style={{
                position: "fixed", 
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -1, // Detrás de todo
            }}
        />
    );
};

export default ParticlesBackground;