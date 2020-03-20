import { NetMDService } from './netmd';
import { AudioExportService } from './audio-export';

interface ServiceRegistry {
    netmdService?: NetMDService;
    audioExportService?: AudioExportService;
}

const ServiceRegistry: ServiceRegistry = {};

export default ServiceRegistry;
