'use client';

import { useEffect } from 'react';
import { notifyEducationEntry } from '../../lib/education-entry-client';

export default function EducationEntryNotifier() {
  useEffect(() => {
    void notifyEducationEntry();
  }, []);

  return null;
}
