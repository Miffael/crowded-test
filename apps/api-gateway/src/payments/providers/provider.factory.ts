import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderAAdapter } from './provider-a.adapter';
import { ProviderBAdapter } from './provider-b.adapter';
import { ProviderAdapter } from './provider.interface';

@Injectable()
export class ProviderFactory {
  constructor(
    private readonly providerAAdapter: ProviderAAdapter,
    private readonly providerBAdapter: ProviderBAdapter,
  ) {}

  getAdapter(provider: string): ProviderAdapter {
    switch (provider) {
      case 'ProviderA':
        return this.providerAAdapter;
      case 'ProviderB':
        return this.providerBAdapter;
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }
  }
}
