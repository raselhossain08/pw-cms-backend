import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Aircraft } from './entities/aircraft.entity';
import { CreateAircraftDto } from './dto/create-aircraft.dto';
import { UpdateAircraftDto } from './dto/update-aircraft.dto';
import { FilterAircraftDto } from './dto/filter-aircraft.dto';

@Injectable()
export class AircraftService {
    constructor(
        @InjectModel(Aircraft.name) private aircraftModel: Model<Aircraft>,
    ) { }

    async create(createAircraftDto: CreateAircraftDto): Promise<Aircraft> {
        const aircraft = new this.aircraftModel(createAircraftDto);
        return aircraft.save();
    }

    async findAll(filterDto: FilterAircraftDto) {
        const {
            type,
            status,
            search,
            minPrice,
            maxPrice,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = filterDto;

        const query: any = {};

        // Apply filters
        if (type) {
            query.type = type;
        }

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) {
                query.price.$gte = minPrice;
            }
            if (maxPrice !== undefined) {
                query.price.$lte = maxPrice;
            }
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Sorting
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            this.aircraftModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
            this.aircraftModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string): Promise<Aircraft> {
        const aircraft = await this.aircraftModel.findById(id).exec();
        if (!aircraft) {
            throw new NotFoundException(`Aircraft with ID ${id} not found`);
        }
        return aircraft;
    }

    async update(
        id: string,
        updateAircraftDto: UpdateAircraftDto,
    ): Promise<Aircraft> {
        const aircraft = await this.aircraftModel
            .findByIdAndUpdate(id, updateAircraftDto, { new: true })
            .exec();
        if (!aircraft) {
            throw new NotFoundException(`Aircraft with ID ${id} not found`);
        }
        return aircraft;
    }

    async remove(id: string): Promise<void> {
        const result = await this.aircraftModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Aircraft with ID ${id} not found`);
        }
    }

    async incrementViews(id: string): Promise<Aircraft> {
        const aircraft = await this.aircraftModel
            .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
            .exec();
        if (!aircraft) {
            throw new NotFoundException(`Aircraft with ID ${id} not found`);
        }
        return aircraft;
    }

    async incrementInquiries(id: string): Promise<Aircraft> {
        const aircraft = await this.aircraftModel
            .findByIdAndUpdate(id, { $inc: { inquiries: 1 } }, { new: true })
            .exec();
        if (!aircraft) {
            throw new NotFoundException(`Aircraft with ID ${id} not found`);
        }
        return aircraft;
    }

    async getStatistics() {
        const [
            totalListings,
            availableCount,
            reservedCount,
            underContractCount,
            soldCount,
            totalValue,
            byType,
        ] = await Promise.all([
            this.aircraftModel.countDocuments().exec(),
            this.aircraftModel.countDocuments({ status: 'Available' }).exec(),
            this.aircraftModel.countDocuments({ status: 'Reserved' }).exec(),
            this.aircraftModel.countDocuments({ status: 'Under Contract' }).exec(),
            this.aircraftModel.countDocuments({ status: 'Sold' }).exec(),
            this.aircraftModel
                .aggregate([
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$price' },
                        },
                    },
                ])
                .exec(),
            this.aircraftModel
                .aggregate([
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            avgPrice: { $avg: '$price' },
                        },
                    },
                ])
                .exec(),
        ]);

        return {
            totalListings,
            statusBreakdown: {
                available: availableCount,
                reserved: reservedCount,
                underContract: underContractCount,
                sold: soldCount,
            },
            totalValue: totalValue[0]?.total || 0,
            byType,
        };
    }
}
