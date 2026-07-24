import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { showGameCaption } from '../ui/components/hud/CaptionBox';
import * as THREE from 'three';

// Helper to calculate distance
const getDistanceTo = (bodyId: string, shipPos: THREE.Vector3, bodies: any[]) => {
  const body = bodies.find((b: any) => b.name.toLowerCase() === bodyId.toLowerCase());
  if (!body) return Infinity;
  return shipPos.distanceTo(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
};

export const StoryManager: React.FC = () => {
  const storyProgress = useStore((s) => s.storyProgress);
  const setStoryProgress = useStore((s) => s.setStoryProgress);
  const playerName = useStore((s) => s.playerName) || 'Commander';

  const progressRef = useRef(storyProgress);
  const isSequenceActive = useRef(false);

  useEffect(() => {
    progressRef.current = storyProgress;
  }, [storyProgress]);

  const queueCaptions = (
    captions: { text: string; type?: 'info' | 'warning' | 'critical' | 'success'; delay: number }[],
    onComplete?: () => void
  ) => {
    isSequenceActive.current = true;
    useStore.getState().setStorySequenceActive(true);
    let accumulatedDelay = 0;

    captions.forEach((cap, index) => {
      accumulatedDelay += cap.delay;
      setTimeout(() => {
        // Replace {playerName} with actual player name
        const text = cap.text.replace(/\{playerName\}/g, playerName);
        showGameCaption(text, cap.type || 'info');
        
        if (index === captions.length - 1) {
          setTimeout(() => {
            isSequenceActive.current = false;
            useStore.getState().setStorySequenceActive(false);
            if (onComplete) onComplete();
          }, 4000);
        }
      }, accumulatedDelay);
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isSequenceActive.current) return;
      
      const state = useStore.getState();
      const ship = state.ship;
      const bodies = state.bodies;
      
      if (!ship || !bodies || bodies.length === 0) return;
      const shipPos = new THREE.Vector3(ship.position.x, ship.position.y, ship.position.z);

      const progress = progressRef.current;

      // ACT I: Earth
      if (progress === 0) {
        queueCaptions([
          { text: "[Global Broadcast]: The 'Hollow Phage' virus has reached a 94% planetary infection rate. Earth is going dark.", type: 'critical', delay: 1000 },
          { text: `[{playerName}]: "We're the last launch, Modi. The Hail Mary protocol. We need to synthesize the cure using extreme environmental precursors from across the entire solar system."`, delay: 9000 },
          { text: `[Modi]: "Engines primed, {playerName}. But to build the vaccine, we first need the unmutated base of the virus itself."`, delay: 10000 },
          { text: `[{playerName}]: "Extracting the atmospheric samples now. It's in the air, the water... it's everywhere down there."`, delay: 10000 },
          { text: "[Extraction Complete]: Earth-strain pathogen locked in the cryogenic synthesizer.", type: 'success', delay: 9000 },
          { text: `[Modi]: "Initiating main thrusters. Leaving Earth orbit. We have eight planets left to visit, and a rapidly closing window of human survival."`, delay: 8000 },
          { text: "[Synthesis Log]: Precursor 1/9 acquired. Viral baseline secured.", type: 'info', delay: 9000 }
        ], () => {
          setStoryProgress(1);
          useStore.setState((s) => {
            const m = [...s.missions];
            const act1 = m.find(m => m.id === 'pz_act1_earth');
            const act2 = m.find(m => m.id === 'pz_act2_mercury');
            if (act1) { act1.status = 'completed'; act1.progressText = '1/1 Pathogen Secured'; }
            if (act2) { act2.status = 'active'; act2.progressText = 'Travel to Mercury'; }
            return { missions: m, activeCompletedMission: act1 ? act1.id : null };
          });
        });
      }

      // ACT II: Mercury
      else if (progress === 1 && getDistanceTo('mercury', shipPos, bodies) < 25000) {
        queueCaptions([
          { text: "[Navigation Log]: Arriving at Mercury. Proximity to the Sun is causing severe hull thermal expansion.", type: 'warning', delay: 1000 },
          { text: `[{playerName}]: "We need the solar-forged isotopes from the Caloris Basin to act as the primary catalyst. Deploy the thermal tethers."`, delay: 8000 },
          { text: `[Modi]: "Warning: Hull temperature is 420°C. My external optical sensors are beginning to melt."`, type: 'critical', delay: 8000 },
          { text: `[{playerName}]: "Just hold the ship steady in the shadow of this crater rim for ten more seconds!"`, delay: 8000 },
          { text: "[System Alert]: Isotope extraction successful. Radiation shielding at 12%.", type: 'success', delay: 8000 },
          { text: `[{playerName}]: "Punch it, Modi! Get us away from the sun!"`, delay: 7000 },
          { text: "[Synthesis Log]: Precursor 2/9 acquired. Solar catalyst secured.", type: 'info', delay: 7000 }
        ], () => {
          setStoryProgress(2);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act2_mercury');
            const next = m.find(m => m.id === 'pz_act3_venus');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Catalyst Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Venus'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT III: Venus
      else if (progress === 2 && getDistanceTo('venus', shipPos, bodies) < 30000) {
        queueCaptions([
          { text: "[Navigation Log]: Descending into the atmosphere of Venus. Atmospheric pressure: 92 times that of Earth.", type: 'warning', delay: 1000 },
          { text: `[Modi]: "{playerName}, the sulfuric acid clouds are eroding our primary sensor arrays. The solvent we need is in the lower atmosphere."`, delay: 8000 },
          { text: `[{playerName}]: "Reroute power to the structural integrity field. We're diving deep."`, delay: 8000 },
          { text: "[System Alert]: Groaning metal echoes through the cockpit as the ship fights the crushing pressure.", type: 'critical', delay: 7000 },
          { text: `[Modi]: "Scoops deployed. Sulfuric enzymes are being filtered into the synthesizer."`, type: 'success', delay: 8000 },
          { text: `[{playerName}]: "Ascending before the hull collapses! That was too close."`, delay: 7000 },
          { text: "[Synthesis Log]: Precursor 3/9 acquired. Acidic solvent secured.", type: 'info', delay: 7000 }
        ], () => {
          setStoryProgress(3);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act3_venus');
            const next = m.find(m => m.id === 'pz_act4_mars');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Solvent Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Mars'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT IV: Mars
      else if (progress === 3 && getDistanceTo('mars', shipPos, bodies) < 25000) {
        queueCaptions([
          { text: "[Scanner Feed]: A massive global dust storm is currently engulfing Mars.", type: 'warning', delay: 1000 },
          { text: `[{playerName}]: "We need the subterranean oxidized salts from deep inside the Olympus Mons lava tubes. The dust storm will shred the ship if we land."`, delay: 8000 },
          { text: `[Modi]: "I will pilot the drone through the storm. My reaction time is 0.003 seconds. However, I cannot guarantee the drone's paint job."`, delay: 8000 },
          { text: `[{playerName}]: "Forget the paint, Modi, just get the salts!"`, delay: 8000 },
          { text: "[Action Sequence]: Drone navigates treacherous crosswinds, diving into the extinct volcano.", delay: 7000 },
          { text: `[Modi]: "Salts extracted. Drone returning. It is now completely stripped of its exterior plating. It looks very embarrassing."`, type: 'success', delay: 8000 },
          { text: "[Synthesis Log]: Precursor 4/9 acquired. Martian binding agent secured.", type: 'info', delay: 7000 }
        ], () => {
          setStoryProgress(4);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act4_mars');
            const next = m.find(m => m.id === 'pz_act5_jupiter');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Salts Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Jupiter'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT V: Jupiter
      else if (progress === 4 && getDistanceTo('jupiter', shipPos, bodies) < 150000) {
        queueCaptions([
          { text: "[Navigation Log]: Approaching Jupiter. The Great Red Spot is churning violently below.", type: 'info', delay: 1000 },
          { text: `[{playerName}]: "The metallic hydrogen we need only exists under the extreme gravity of Jupiter's lower layers."`, delay: 8000 },
          { text: `[Modi]: "{playerName}, the gravitational forces here will exceed 12 Gs. Your human skeletal structure is not rated for this."`, type: 'warning', delay: 8000 },
          { text: `[{playerName}]: "Pump my suit full of oxygenating fluid. I'm taking manual control for the dive."`, delay: 8000 },
          { text: "[Telemetry]: Entering the hydrogen storms. Lightning strikes the hull.", type: 'critical', delay: 7000 },
          { text: `[Modi]: "{playerName}, please remind me to file a formal complaint with the solar system’s manager. Jupiter's gravity is incredibly rude to my delicate servos."`, delay: 8000 },
          { text: `[{playerName}]: (Straining, barely conscious) "Got... the hydrogen... pulling up!"`, type: 'success', delay: 8000 },
          { text: "[Synthesis Log]: Precursor 5/9 acquired. Metallic hydrogen secured.", type: 'info', delay: 7000 }
        ], () => {
          setStoryProgress(5);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act5_jupiter');
            const next = m.find(m => m.id === 'pz_act6_saturn');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Hydrogen Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Saturn'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT VI: Saturn
      else if (progress === 5 && getDistanceTo('saturn', shipPos, bodies) < 120000) {
        queueCaptions([
          { text: "[Scanner Feed]: Navigating the icy debris field of Saturn's rings.", delay: 1000 },
          { text: `[{playerName}]: "We need to extract the electro-charged aerosols from the hexagonal storm at Saturn's north pole."`, delay: 8000 },
          { text: `[Modi]: "Navigating the ring debris is hazardous. A single ice chunk traveling at orbital velocity will pierce our reactor."`, type: 'critical', delay: 8000 },
          { text: `[{playerName}]: "Match rotation with the B-Ring gap. We’ll slip through the Cassini Division."`, delay: 8000 },
          { text: "[System Alert]: Thrusters fire in short, precise bursts as the ship dances through the celestial ice.", delay: 7000 },
          { text: `[Modi]: "Entering the polar hexagon. Harvesting charged aerosols now."`, type: 'success', delay: 7000 },
          { text: "[Synthesis Log]: Precursor 6/9 acquired. Electro-polarizer secured.", type: 'info', delay: 7000 }
        ], () => {
          setStoryProgress(6);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act6_saturn');
            const next = m.find(m => m.id === 'pz_act7_uranus');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Polarizer Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Uranus'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT VII: Uranus
      else if (progress === 6 && getDistanceTo('uranus', shipPos, bodies) < 80000) {
        queueCaptions([
          { text: "[Navigation Log]: Uranus. The ice giant is eerily calm, tilted on its side in the dark.", delay: 1000 },
          { text: `[Modi]: "The cryo-ammonia required to freeze the virus's replication cycle is trapped in the mantle ice."`, delay: 8000 },
          { text: `[{playerName}]: "I have to do a spacewalk. The ship's lasers can't penetrate the ice crust without causing a blowout."`, delay: 8000 },
          { text: "[Suit Telemetry]: External temp -224°C. Life support at maximum heating.", type: 'warning', delay: 7000 },
          { text: `[{playerName}]: (Chipping at the blue ice) "It's so cold out here, Modi. The suit joints are seizing up."`, delay: 8000 },
          { text: `[Modi]: "Playing upbeat jazz to psychologically simulate warmth. Extract the matrix, {playerName}."`, delay: 8000 },
          { text: "[Synthesis Log]: Precursor 7/9 acquired. Cryo-ammonia secured.", type: 'success', delay: 7000 }
        ], () => {
          setStoryProgress(7);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act7_uranus');
            const next = m.find(m => m.id === 'pz_act8_neptune');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Matrix Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Neptune'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT VIII: Neptune
      else if (progress === 7 && getDistanceTo('neptune', shipPos, bodies) < 70000) {
        queueCaptions([
          { text: "[Scanner Feed]: Neptune. Deep azure storms whipping around the planet at 2,000 km/h.", delay: 1000 },
          { text: `[{playerName}]: "To make the vaccine airborne for Earth's atmosphere, we need the hyper-kinetic methane isotopes deep in these winds."`, delay: 8000 },
          { text: `[Modi]: "Deploying the aerodynamic scoops. We must match the wind speed, or the scoops will be torn off."`, type: 'warning', delay: 8000 },
          { text: `[{playerName}]: "Pushing engines to the redline! We're riding the storm!"`, delay: 8000 },
          { text: "[System Alert]: The ship shakes violently, alarms blaring as it surfs a supersonic methane hurricane.", type: 'critical', delay: 7000 },
          { text: `[Modi]: "Isotopes captured! Disengaging from the slipstream!"`, type: 'success', delay: 7000 },
          { text: "[Synthesis Log]: Precursor 8/9 acquired. Kinetic dispersant secured.", delay: 7000 },
          { text: `[{playerName}]: "Just one left, buddy. Then we take this cure home."`, delay: 8000 }
        ], () => {
          setStoryProgress(8);
          useStore.setState((s) => {
            const m = [...s.missions];
            const prev = m.find(m => m.id === 'pz_act8_neptune');
            const next = m.find(m => m.id === 'pz_act9_pluto');
            if (prev) { prev.status = 'completed'; prev.progressText = 'Dispersant Secured'; }
            if (next) { next.status = 'active'; next.progressText = 'Travel to Pluto'; }
            return { missions: m, activeCompletedMission: prev ? prev.id : null };
          });
        });
      }

      // ACT IX: Pluto
      else if (progress === 8 && getDistanceTo('pluto', shipPos, bodies) < 200000) {
        queueCaptions([
          { text: "[Navigation Log]: Pluto. The frozen edge of the solar system. The Kuiper Belt looms in the dark.", delay: 1000 },
          { text: `[Modi]: "The final ingredient is the primordial nitrogen ice from Sputnik Planitia. It will fuse the precursors into a stable vaccine."`, delay: 8000 },
          { text: `[{playerName}]: "Landing sequence initiated. Let's finish this."`, delay: 7000 },
          { text: "[Extraction Sequence]: The drill pierces the heart-shaped glacier. The final glowing fluid pumps into the synthesizer.", delay: 8000 },
          { text: `[Modi]: "Vaccine synthesis complete. Efficacy rating: 99.8%. We have the cure, {playerName}."`, type: 'success', delay: 8000 },
          { text: "[Proximity Alert]: A rogue, unmapped Kuiper Belt asteroid collides with the ship's aft section.", type: 'critical', delay: 7000 },
          { text: "[System Failure]: Main reactor breached. Hyper-drive offline. Life support failing.", type: 'critical', delay: 7000 },
          { text: `[{playerName}]: (Bleeding, pulling himself off the console) "Modi! Status!"`, delay: 8000 },
          { text: `[Modi]: "The main ship is dead. We are permanently grounded on Pluto. The emergency return probe is functional, but it only has enough power and life support to carry the vaccine... and one of us."`, delay: 10000 },
          { text: "[System Alert]: The glowing blue vial of the vaccine pulses inside the synthesizer, casting a long shadow in the freezing dark.", delay: 9000 },
          { text: `[Modi]: "{playerName}, my core temperature control can keep the vaccine stable for the journey back to Earth. But if you take the probe, the vaccine will freeze and perish without my internal stasis chamber."`, delay: 10000 },
          { text: `[{playerName}]: "Then the math is simple, Modi. The probe takes you. You take the cure to Earth."`, delay: 8000 },
          { text: `[Modi]: "{playerName}, my primary directive is to ensure your survival. I do not wish to leave you alone on this ice."`, delay: 9000 },
          { text: `[{playerName}]: (Patting the robot's metallic shoulder) "Your primary directive is to save humanity. I'm just one guy. There's 8 billion people waiting for you at home."`, delay: 9000 },
          { text: `[Modi]: "Overriding safety protocols... Transferring vaccine to my chassis. Boarding the return probe."`, type: 'warning', delay: 9000 },
          { text: "[Action Sequence]: The small return probe launches from the wreckage, its bright thruster cutting a line of light back toward the inner solar system.", delay: 9000 },
          { text: `[{playerName}]: (Sitting in the freezing dark of the dead ship, looking up at the distant, tiny speck of the Sun) "Fly safe, Modi... Tell them we won."`, delay: 10000 }
        ], () => {
          setStoryProgress(9);
          // Set velocity to 0 to ground the ship on Pluto
          useStore.setState((s) => {
            if (s.ship) {
              return { 
                ship: { 
                  ...s.ship, 
                  velocity: { x: 0, y: 0, z: 0 },
                  angularVelocity: 0 
                } 
              };
            }
            return s;
          });
          // After final caption, show the custom ending screen by pushing storyProgress to 10
          setTimeout(() => {
            setStoryProgress(10); 
          }, 3000);
        });
      }

      // Optional Moon Missions
      if (!isSequenceActive.current) {
        const state = useStore.getState();
        const moonMissions = state.missions.filter(m => m.id.startsWith('opt_moon_') && m.status === 'available');
        
        for (const mission of moonMissions) {
          const moonNameLower = mission.id.replace('opt_moon_', '');
          
          const dist = getDistanceTo(moonNameLower, shipPos, bodies);
          // Trigger distance for moons
          if (dist < 20000) {
            let moonDialogues: any[] = [];
            
            if (moonNameLower === 'moon') {
              moonDialogues = [
                { text: `[Navigation Log]: Approaching Earth's Moon. Detecting massive debris fields.`, delay: 2000 },
                { text: `[Modi]: "Commander, this is the First Evacuation Fleet. They tried to outrun the virus... but they didn't realize they brought it with them."`, delay: 8000 },
                { text: `[{playerName}]: "All these ships... just frozen tombs now."`, delay: 5000 },
                { text: `[Modi]: "A grim reminder of why we must succeed. We cannot let their sacrifice be for nothing."`, delay: 7000 }
              ];
            } else if (moonNameLower === 'phobos') {
              moonDialogues = [
                { text: `[Navigation Log]: Entering orbit around Phobos, the grooved moon of Mars.`, delay: 2000 },
                { text: `[Modi]: "Fun fact, {playerName}! Phobos is doomed! It's slowly spiraling toward Mars and will eventually crash into it or break into a ring. Talk about a toxic relationship."`, delay: 9000 },
                { text: `[{playerName}]: "Very uplifting, Modi."`, delay: 4000 },
                { text: `[Modi]: "I thought you appreciated my gravitas. I did detect an anomalous monolith on the surface... but no signs of life. Let's move on."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'europa') {
              moonDialogues = [
                { text: `[Navigation Log]: Skimming the icy crust of Jupiter's moon, Europa.`, delay: 2000 },
                { text: `[Modi]: "Commander, I'm detecting a faint automated beacon from beneath the ice. It's a bio-containment facility."`, delay: 8000 },
                { text: `[{playerName}]: "Did they survive the outbreak down there?"`, delay: 5000 },
                { text: `[Modi]: "Negative. The Hollow Phage mutated to survive the sub-glacial oceans. The ice didn't protect them... it trapped them."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'ganymede') {
              moonDialogues = [
                { text: `[Navigation Log]: Approaching Ganymede, the largest moon in the solar system.`, delay: 2000 },
                { text: `[Modi]: "Did you know Ganymede is larger than Mercury? It even has its own magnetic field. It's really quite... attractive."`, delay: 8000 },
                { text: `[{playerName}]: "Was that a magnetism pun?"`, delay: 4000 },
                { text: `[Modi]: "My humor subroutines are fully operational! However, the mining colonies here have gone completely dark. No survivors detected."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'titan') {
              moonDialogues = [
                { text: `[Navigation Log]: Entering the dense, orange atmosphere of Titan.`, delay: 2000 },
                { text: `[Modi]: "Titan's atmosphere is thicker than Earth's. The colonists thought the methane lakes would insulate them from the outbreak."`, delay: 8000 },
                { text: `[{playerName}]: "But they still got infected?"`, delay: 4000 },
                { text: `[Modi]: "Yes. The virus hitchhiked on the final emergency supply drops. An irony as thick as this atmosphere."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'enceladus') {
              moonDialogues = [
                { text: `[Navigation Log]: Passing through the cryo-plumes of Enceladus.`, delay: 2000 },
                { text: `[Modi]: "I am picking up a distress signal... It's looping. 'Stay away. Do not land. The ice is hollow.'"`, delay: 8000 },
                { text: `[{playerName}]: "Hollow... just like the virus."`, delay: 4000 },
                { text: `[Modi]: "Precisely. The colony collapsed months ago. The signal is just a ghost in the machine now. Like me, but less conversational."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'miranda') {
              moonDialogues = [
                { text: `[Navigation Log]: Orbiting Miranda. The surface is heavily scarred and chaotic.`, delay: 2000 },
                { text: `[Modi]: "Miranda looks like it was smashed apart and glued back together by a toddler. Quite the Frankenstein's monster of moons."`, delay: 8000 },
                { text: `[{playerName}]: "Any signs of the Uranus orbital stations?"`, delay: 5000 },
                { text: `[Modi]: "Only debris. It appears they tried to weaponize the icy canyons to collapse on infected ships. It... did not go well."`, delay: 8000 }
              ];
            } else if (moonNameLower === 'triton') {
              moonDialogues = [
                { text: `[Navigation Log]: Nearing Triton, Neptune's largest retrograde moon.`, delay: 2000 },
                { text: `[Modi]: "Triton orbits backwards! It's a rebel. A captured dwarf planet that refuses to conform. I respect that."`, delay: 8000 },
                { text: `[{playerName}]: "You respect a rock, Modi?"`, delay: 4000 },
                { text: `[Modi]: "I respect its trajectory! Sadly, the deep-freeze colonies here are entirely unresponsive. Let's leave this rebel in peace."`, delay: 8000 }
              ];
            } else {
              // Fallback
              moonDialogues = [
                { text: `[Navigation Log]: Approaching ${moonNameLower.toUpperCase()}.`, delay: 2000 },
                { text: `[Modi]: "Scans of this moon reveal no signs of human survival. The Hollow Phage was remarkably thorough."`, delay: 6000 },
                { text: `[{playerName}]: "Understood. Marking as explored."`, delay: 4000 }
              ];
            }
            
            queueCaptions(moonDialogues, () => {
              useStore.setState(s => {
                const newM = [...s.missions];
                const mIdx = newM.findIndex(x => x.id === mission.id);
                if (mIdx !== -1) {
                  newM[mIdx] = { ...newM[mIdx], status: 'completed', progressText: 'Exploration Complete' };
                }
                return { missions: newM };
              });
            });
            break; // only trigger one moon at a time
          }
        }
      }
      // Classified Path Missions
      if (!isSequenceActive.current) {
        const state = useStore.getState();
        const clsMissions = state.missions.filter(m => m.type === 'classified' && m.status === 'available' && m.meta?.path);
        
        for (const mission of clsMissions) {
          const path = mission.meta.path;
          const currentStep = mission.meta.step;
          if (currentStep < path.length) {
            const targetBody = path[currentStep];
            const dist = getDistanceTo(targetBody, shipPos, bodies);
            
            if (dist < 35000) {
              // Trigger dialogue for this step
              let dialogues: any[] = [];
              const isFinalStep = currentStep === path.length - 1;
              
              if (mission.id === 'cls_icarus_run') {
                if (currentStep === 0) {
                   dialogues = [{ text: `[Modi]: "Venus checkpoint reached. The Icarus Run... a legendary pre-pandemic smuggler's route. They say pilots skimmed the corona to shake corporate pursuit."`, delay: 8000 }];
                } else if (currentStep === 1) {
                   dialogues = [{ text: `[Modi]: "Mercury checkpoint. Only the crazy or the desperate flew this close to the Sun. And we're both."`, delay: 7000 }];
                } else {
                   dialogues = [
                     { text: `[Navigation Log]: Proximity Alert! Extreme solar radiation detected.`, type: 'warning', delay: 4000 },
                     { text: `[Modi]: "Icarus Run complete. The myth says the first pilot to do this claimed the Sun 'sang' in their comms. All I hear is static... and maybe a faint melody?"`, delay: 9000 }
                   ];
                }
              } else if (mission.id === 'cls_jovian_gauntlet') {
                 if (currentStep === 0) {
                    dialogues = [{ text: `[Modi]: "Jupiter's gravity well. The start of the Jovian Gauntlet. A pre-war military endurance test to separate aces from debris."`, delay: 8000 }];
                 } else if (currentStep === 1) {
                    dialogues = [{ text: `[Modi]: "Europa checkpoint cleared. Watch the radiation belts, Commander. They'll fry your electronics if you linger."`, delay: 7000 }];
                 } else {
                    dialogues = [{ text: `[Modi]: "Ganymede reached. Gauntlet complete. You would have made a fine fighter pilot, Commander."`, delay: 6000 }];
                 }
              } else if (mission.id === 'cls_deep_dark') {
                 if (currentStep === 0) {
                    dialogues = [{ text: `[Modi]: "Uranus. The start of the 'Deep Dark'. This is the rumored flight path of the first autonomous AI probes before they went rogue."`, delay: 8000 }];
                 } else if (currentStep === 1) {
                    dialogues = [{ text: `[Modi]: "Neptune checkpoint. Commander, my sensors are picking up phantom telemetry data. Like echoes of old probes whispering in the dark."`, delay: 8000 }];
                 } else {
                    dialogues = [{ text: `[Modi]: "Pluto reached. The Deep Dark is complete. The phantom telemetry just stopped. I think they were just welcoming us to the edge."`, delay: 9000 }];
                 }
              }
              
              queueCaptions(dialogues, () => {
                useStore.setState(s => {
                  const newM = [...s.missions];
                  const mIdx = newM.findIndex(x => x.id === mission.id);
                  if (mIdx !== -1) {
                    if (isFinalStep) {
                      newM[mIdx] = { ...newM[mIdx], status: 'completed', progressText: 'Path Completed' };
                    } else {
                      const nextTarget = path[currentStep + 1];
                      const nextTargetName = nextTarget.charAt(0).toUpperCase() + nextTarget.slice(1);
                      newM[mIdx] = { 
                        ...newM[mIdx], 
                        meta: { ...newM[mIdx].meta, step: currentStep + 1 },
                        progressText: `Waypoint: ${nextTargetName} (${currentStep + 1}/${path.length})`
                      };
                    }
                  }
                  return { missions: newM };
                });
              });
              break; // only trigger one sequence
            }
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [playerName]);

  return null;
};
