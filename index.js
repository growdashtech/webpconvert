#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import gulp from 'gulp';
import imagemin from 'gulp-imagemin';
import rename from 'gulp-rename';
import webp from 'imagemin-webp';
import { resolve, dirname } from 'path';

const { argv } = yargs(hideBin(process.argv))
  .usage('Convert jpg/png images in specified directory to webp\nUsage: webpconvert [source] [target] [options]')
  .wrap(null)
  .example('webpconvert')
  .example('webpconvert sample-images')
  .example('webpconvert sample-images -q 50')
  .example('webpconvert sample-images --prefix="img-" --suffix="-compressed"')
  .example('webpconvert sample-images output')
  .example('webpconvert sample-images/KittenJPG.jpg')
  .options('p', {
    alias: 'prefix',
    demandOption: false,
    default: '',
    describe: 'Specify the prefix of output filename.',
    type: 'string',
    requiresArg: true,
  })
  .options('s', {
    alias: 'suffix',
    demandOption: false,
    default: '',
    describe: 'Specify the suffix of output filename.',
    type: 'string',
    requiresArg: true,
  })
  .options('q', {
    alias: 'quality',
    demandOption: false,
    default: 80,
    describe: 'Specify the quality of webp image. Lower values yield better compression but the least image quality.',
    type: 'number',
    requiresArg: true,
  })
  .options('r', {
    alias: 'recursive',
    demandOption: false,
    default: false,
    describe: 'Include files in sub-folders. Will be ignored if the [source] is a file.',
    type: 'boolean',
    requiresArg: false,
  })
  .options('m', {
    alias: 'mute',
    demandOption: false,
    default: false,
    describe: 'Disable output messages.',
    type: 'boolean',
    requiresArg: false,
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v');

// Setup Source and Target

const getExt = (str) => {
  const splitted = str.split('.');
  if (splitted.length < 2) return '';
  if (!splitted[0]) return '';
  return splitted.slice(-1)[0];
};
const isFile = (str) => !!getExt(str);

const source = argv._[0] || '.';

// Determine quality from args (0-100)
const QUALITY = Number.isFinite(Number(argv.quality))
  ? Math.max(0, Math.min(100, Number(argv.quality)))
  : 80;

let PNGGlobs = [];
let JPGGlobs = [];
let baseDir = '';

if (isFile(source)) {
  const extension = getExt(source).toLowerCase();
  if (extension === 'png') {
    PNGGlobs = [source];
  } else if (extension === 'jpg' || extension === 'jpeg') {
    JPGGlobs = [source];
  }
  baseDir = dirname(source);
} else {
  const wildcard = '**/*';
  baseDir = source;
  // Add explicit upper/lowercase variants to avoid FS-specific case issues
  PNGGlobs = [
    resolve(source, `${wildcard}.png`),
    resolve(source, `${wildcard}.PNG`),
  ];
  // Support both jpg and jpeg
  JPGGlobs = [
    resolve(source, `${wildcard}.jpg`),
    resolve(source, `${wildcard}.JPG`),
    resolve(source, `${wildcard}.jpeg`),
    resolve(source, `${wildcard}.JPEG`),
  ];
}

let target = argv._[1] || source || '.';

if (isFile(target)) {
  target = dirname(target);
}

// Processing

if (PNGGlobs.length) {
  gulp.src(PNGGlobs, { nocase: true, base: baseDir })
    .pipe(imagemin([webp({
      quality: QUALITY,
    })], {
      verbose: !argv.mute,
      silent: false,
    }))
    .pipe(rename({ prefix: argv.prefix, suffix: argv.suffix, extname: '.webp' }))
    .pipe(gulp.dest(target));
}

if (JPGGlobs.length) {
  gulp.src(JPGGlobs, { nocase: true, base: baseDir })
    .pipe(imagemin([webp({
      quality: QUALITY,
    })], {
      verbose: !argv.mute,
      silent: false,
    }))
    .pipe(rename({ prefix: argv.prefix, suffix: argv.suffix, extname: '.webp' }))
    .pipe(gulp.dest(target));
}

// If output root differs, copy non-image files as-is preserving structure
try {
  const sourceIsFile = isFile(source);
  const targetResolved = resolve(target);
  const sourceResolved = resolve(sourceIsFile ? dirname(source) : source);
  const shouldCopyNonImages = !sourceIsFile && targetResolved !== sourceResolved;
  if (shouldCopyNonImages) {
    const allFiles = resolve(sourceResolved, '**/*');
    const notPng = `!${resolve(sourceResolved, '**/*.png')}`;
    const notPngUpper = `!${resolve(sourceResolved, '**/*.PNG')}`;
    const notJpg = `!${resolve(sourceResolved, '**/*.jpg')}`;
    const notJpgUpper = `!${resolve(sourceResolved, '**/*.JPG')}`;
    const notJpeg = `!${resolve(sourceResolved, '**/*.jpeg')}`;
    const notJpegUpper = `!${resolve(sourceResolved, '**/*.JPEG')}`;
    const notWebp = `!${resolve(sourceResolved, '**/*.webp')}`;
    const notWebpUpper = `!${resolve(sourceResolved, '**/*.WEBP')}`;
    gulp.src([
      allFiles,
      notPng,
      notPngUpper,
      notJpg,
      notJpgUpper,
      notJpeg,
      notJpegUpper,
      notWebp,
      notWebpUpper,
    ], {
      base: sourceResolved,
      nocase: true,
    })
      .pipe(gulp.dest(target));
  }
} catch (e) {
  if (!argv.mute) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}
