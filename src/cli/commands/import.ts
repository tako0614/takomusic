// mf import command - convert external formats to MFS

import * as fs from 'fs';
import * as path from 'path';
import { ExitCodes } from '../../errors.js';
import { convertMusicXMLToMFS } from '../../importers/musicxml.js';

type ImportFormat = 'musicxml' | 'midi' | 'auto';

export async function importCommand(args: string[]): Promise<number> {
  let inputFile: string | undefined;
  let outputFile: string | undefined;
  let format: ImportFormat = 'auto';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' || args[i] === '--format') {
      format = args[i + 1] as ImportFormat;
      i++;
    } else if (args[i] === '-o' || args[i] === '--output') {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf import <file> [options]

Options:
  -f, --format <format>  Input format (musicxml, midi, auto)
  -o, --output <file>    Output file path (.mf)
  -h, --help             Show this help message

Supported formats:
  musicxml    MusicXML files (.xml, .musicxml, .mxl)
  midi        Standard MIDI files (.mid, .midi) [coming soon]

Examples:
  mf import song.xml
  mf import score.musicxml -o my_song.mf
  mf import -f musicxml input.xml
`);
      return ExitCodes.SUCCESS;
    } else if (!inputFile && !args[i].startsWith('-')) {
      inputFile = args[i];
    }
  }

  if (!inputFile) {
    console.error('No input file specified.');
    console.log('Run "mf import --help" for usage information.');
    return ExitCodes.IO_ERROR;
  }

  // Resolve input path
  const resolvedInput = path.resolve(inputFile);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`File not found: ${resolvedInput}`);
    return ExitCodes.IO_ERROR;
  }

  // Auto-detect format if needed
  if (format === 'auto') {
    const ext = path.extname(resolvedInput).toLowerCase();
    if (['.xml', '.musicxml', '.mxl'].includes(ext)) {
      format = 'musicxml';
    } else if (['.mid', '.midi'].includes(ext)) {
      format = 'midi';
    } else {
      console.error(`Cannot auto-detect format for: ${ext}`);
      console.log('Please specify format with -f option.');
      return ExitCodes.IO_ERROR;
    }
  }

  // Determine output path
  if (!outputFile) {
    const baseName = path.basename(resolvedInput, path.extname(resolvedInput));
    outputFile = path.join(path.dirname(resolvedInput), `${baseName}.mf`);
  }
  const resolvedOutput = path.resolve(outputFile);

  console.log(`Importing ${path.basename(resolvedInput)}...`);
  console.log(`Format: ${format}`);

  try {
    switch (format) {
      case 'musicxml':
        await convertMusicXMLToMFS(resolvedInput, resolvedOutput);
        break;

      case 'midi':
        console.error('MIDI import is not yet implemented.');
        return ExitCodes.STATIC_ERROR;

      default:
        console.error(`Unknown format: ${format}`);
        return ExitCodes.STATIC_ERROR;
    }

    console.log(`Output: ${resolvedOutput}`);
    console.log('Import complete.');
    return ExitCodes.SUCCESS;

  } catch (err) {
    if (err instanceof Error) {
      console.error(`Import failed: ${err.message}`);
    }
    return ExitCodes.STATIC_ERROR;
  }
}
