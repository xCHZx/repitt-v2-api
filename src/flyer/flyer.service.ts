import { Injectable, InternalServerErrorException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');
import * as path from 'path';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FlyerService {
  private readonly templatePath: string;

  constructor(private readonly supabaseService: SupabaseService) {
    // Resolve the template path relative to the project root
    this.templatePath = path.join(process.cwd(), 'src', 'assets', 'templates', 'flyer.jpg');
  }

  /**
   * Generates a flyer by compositing the QR code onto the template,
   * uploads it to Supabase, and returns the public URL.
   */
  async generateFlyer(repittCode: string, qrBuffer: Buffer): Promise<string> {
    try {
      // 1. Resize QR to 550x550 (same as Laravel version)
      const resizedQr = await sharp(qrBuffer)
        .resize(550, 550)
        .png()
        .toBuffer();

      // 2. Get template metadata to calculate center position
      const templateMeta = await sharp(this.templatePath).metadata();
      const templateWidth = templateMeta.width || 800;
      const templateHeight = templateMeta.height || 1035;

      // 3. Calculate position: center horizontally, offset -180px vertically
      const qrSize = 550;
      const left = Math.round((templateWidth - qrSize) / 2);
      const top = Math.round((templateHeight - qrSize) / 2) - 180;

      // 4. Composite QR onto template
      const flyerBuffer = await sharp(this.templatePath)
        .composite([
          {
            input: resizedQr,
            left,
            top,
          },
        ])
        .png()
        .toBuffer();

      // 5. Upload to Supabase
      const publicUrl = await this.supabaseService.uploadBuffer(
        flyerBuffer,
        'image/png',
        `flyers/flyer-${repittCode}`,
      );

      return publicUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al generar el flyer: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }
}
