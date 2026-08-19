import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartureCitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    const cities = await this.prisma.departureCity.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      label: city.name,
    }));
  }
}
