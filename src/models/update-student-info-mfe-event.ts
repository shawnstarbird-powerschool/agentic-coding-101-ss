import { MfeEvent } from '@ps-refarch-ux/mfe-utils';

export interface UpdateStudentInfoMfeEvent extends MfeEvent {
  context: {
    schoolId: number;
    studentNumber: string;
  };
}
