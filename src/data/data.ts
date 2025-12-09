import { AssemblyPoint } from './types';

export const SAFE_ASSEMBLY_POINTS: AssemblyPoint[] = [
  {
    id: '1',
    name: 'Central High School Gymnasium',
    latitude: 34.0522,
    longitude: -118.2437,
    capacity: 500,
    type: 'shelter'
  },
  {
    id: '2',
    name: 'Memorial Hospital Tent City',
    latitude: 34.0550,
    longitude: -118.2500,
    capacity: 200,
    type: 'medical'
  },
  {
    id: '3',
    name: 'Community Center Food Bank',
    latitude: 34.0480,
    longitude: -118.2400,
    capacity: 350,
    type: 'food'
  },
  {
    id: '4',
    name: 'Westside Emergency Hub',
    latitude: 34.0600,
    longitude: -118.2600,
    capacity: 150,
    type: 'shelter'
  }
];
