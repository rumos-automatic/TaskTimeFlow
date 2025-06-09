import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabaseService: SupabaseService,
  ) {}

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      
      // Get user data from Supabase
      const { data: user, error } = await this.supabaseService
        .getClient()
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (error || !user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        userId: user.id,
        email: user.email,
        ...user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserFromToken(token: string): Promise<any> {
    const client = this.supabaseService.getClientWithAuth(token);
    
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return user;
  }
}