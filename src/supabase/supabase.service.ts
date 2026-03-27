import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new InternalServerErrorException('Las credenciales de Supabase no están configuradas.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Uploads an image to the specified bucket and returns the public URL.
   */
  async uploadImage(file: Express.Multer.File, path: string): Promise<string> {
    const bucketName = this.configService.get<string>('SYSTEM_BUCKET_NAME') || 'businesses-media';
    
    // We get the extension to be safe
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExtension}`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(`Error al subir imagen a Supabase: ${error.message}`);
    }

    // Generate public URL
    const { data: urlData } = this.supabase.storage.from(bucketName).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  /**
   * Uploads a raw buffer to the specified bucket and returns the public URL.
   */
  async uploadBuffer(buffer: Buffer, mimetype: string, path: string): Promise<string> {
    const bucketName = this.configService.get<string>('SYSTEM_BUCKET_NAME') || 'businesses-media';
    const fileName = `${path}-${Date.now()}.png`; // Usually used for QR codes (PNG)

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(`Error al subir archivo a Supabase: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage.from(bucketName).getPublicUrl(data.path);
    return urlData.publicUrl;
  }
}
