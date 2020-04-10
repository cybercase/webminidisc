import { NetMDService } from './netmd';
import { AudioExportService } from './audio-export';
import { MediaRecorderService } from './mediarecorder';

interface ServiceRegistry {
    netmdService?: NetMDService;
    audioExportService?: AudioExportService;
    mediaRecorderService?: MediaRecorderService;
}

const ServiceRegistry: ServiceRegistry = {};

export default ServiceRegistry;
