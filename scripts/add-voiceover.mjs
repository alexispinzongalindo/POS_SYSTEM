#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Tour script lines (you can edit these)
const SCRIPT_EN = [
  'Welcome to IslaPOS, the modern point of sale system for restaurants.',
  'Start at the Admin dashboard to manage your business.',
  'Use the Floor Plan to arrange tables and seating.',
  'View and manage Orders in real time.',
  'Check Reports to track sales and performance.',
  'Manage Inventory to keep stock in sync.',
  'Set up Reservations and accept bookings.',
  'Manage Staff roles and permissions.',
  'Access Support when you need help.',
  'Use Training to onboard new team members.',
  'The POS screen lets you take orders quickly.',
  'View Tables and manage seating status.',
  'The Kitchen Display shows active orders.',
  'Review Order History anytime.',
  'Thank you for touring IslaPOS.'
];

const SCRIPT_ES = [
  'Bienvenido a IslaPOS, el sistema de punto de venta moderno para restaurantes.',
  'Comience en el panel de Administración para gestionar su negocio.',
  'Use el Plano de Piso para organizar mesas y asientos.',
  'Vea y gestione Órdenes en tiempo real.',
  'Revise Informes para rastrear ventas y rendimiento.',
  'Gestione Inventario para mantener el stock sincronizado.',
  'Configure Reservas y acepte reservas.',
  'Gestione roles y permisos del Personal.',
  'Acceda a Soporte cuando necesite ayuda.',
  'Use Capacitación para integrar nuevos miembros al equipo.',
  'La pantalla POS le permite tomar órdenes rápidamente.',
  'Vea Mesas y gestione el estado de los asientos.',
  'La Pantalla de Cocina muestra órdenes activas.',
  'Revise el Historial de Órdenes en cualquier momento.',
  'Gracias por recorrer IslaPOS.'
];

function generateVoiceover(lines, lang, voice, outputFile) {
  const tempFiles = [];
  for (let i = 0; i < lines.length; i++) {
    const aiff = `/tmp/${lang}_${i}.aiff`;
    const aac = `/tmp/${lang}_${i}.aac`;
    execSync(`say -v "${voice}" "${lines[i]}" -o "${aiff}"`, { stdio: 'inherit' });
    execSync(`ffmpeg -hide_banner -loglevel error -y -i "${aiff}" -c:a aac "${aac}"`, { stdio: 'inherit' });
    tempFiles.push(aac);
  }
  // Concatenate audio files
  const fileList = `/tmp/${lang}_files.txt`;
  writeFileSync(fileList, tempFiles.map(f => `file '${f}'`).join('\n'));
  execSync(`ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "${fileList}" -c copy "${outputFile}"`, { stdio: 'inherit' });
  // Cleanup
  execSync(`rm ${fileList} ${tempFiles.join(' ')} ${tempFiles.map(f => f.replace('.aac', '.aiff')).join(' ')}`);
  console.log(`Voiceover written: ${outputFile}`);
}

function muxAudioToVideo(videoFile, audioFile, outputFile) {
  execSync(`ffmpeg -hide_banner -loglevel error -y -i "${videoFile}" -i "${audioFile}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputFile}"`, { stdio: 'inherit' });
  console.log(`Muxed video with audio: ${outputFile}`);
}

function main() {
  const [,, videoEn, videoEs] = process.argv;
  if (!videoEn || !videoEs) {
    console.error('Usage: node add-voiceover.mjs <video-en.mp4> <video-es.mp4>');
    process.exit(1);
  }

  console.log('Generating EN voiceover...');
  generateVoiceover(SCRIPT_EN, 'en', 'Samantha', 'public/voiceover-en.aac');
  console.log('Generating ES voiceover...');
  generateVoiceover(SCRIPT_ES, 'es', 'Paulina', 'public/voiceover-es.aac');

  console.log('Muxing EN video with voiceover...');
  muxAudioToVideo(videoEn, 'public/voiceover-en.aac', 'public/videos/islapos-en-with-voice.mp4');
  console.log('Muxing ES video with voiceover...');
  muxAudioToVideo(videoEs, 'public/voiceover-es.aac', 'public/videos/islapos-es-with-voice.mp4');

  console.log('Done. Replace marketing videos with the -with-voice versions if you like them.');
}

main();
