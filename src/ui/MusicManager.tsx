import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

const MusicManager = () => {
  const gamePhase = useStore((state) => state.gamePhase);
  const menuAudioRef = useRef<HTMLAudioElement>(null);
  const gameAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const menuAudio = menuAudioRef.current;
    const gameAudio = gameAudioRef.current;

    if (!menuAudio || !gameAudio) {
      return;
    }

    const fadeOut = (audio: HTMLAudioElement) => {
      if (audio.volume > 0.1) {
        audio.volume -= 0.1;
        setTimeout(() => fadeOut(audio), 100);
      } else {
        audio.pause();
      }
    };

    const fadeIn = (audio: HTMLAudioElement) => {
      audio.play();
      audio.volume = 0;
      const fade = () => {
        if (audio.volume < 1) {
          audio.volume += 0.1;
          setTimeout(fade, 100);
        }
      };
      fade();
    };

    if (gamePhase === 'menu') {
      fadeOut(gameAudio);
      fadeIn(menuAudio);
    } else if (gamePhase === 'Playing') {
      fadeOut(menuAudio);
      fadeIn(gameAudio);
    }
  }, [gamePhase]);

  return (
    <>
      <audio ref={menuAudioRef} src="/far-north.mp3" loop />
      <audio ref={gameAudioRef} src="/antent.mp3" loop />
    </>
  );
};

export default MusicManager;