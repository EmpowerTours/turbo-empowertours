'use client';

import Presentation from '@/components/pitch/Presentation';
import CoverSlide from '@/components/pitch/CoverSlide';
import IntroSlide from '@/components/pitch/IntroSlide';
import AnalyticsSlide from '@/components/pitch/AnalyticsSlide';
import QuoteSlide from '@/components/pitch/QuoteSlide';
import OutroSlide from '@/components/pitch/OutroSlide';

export default function PitchPage() {
  return (
    <Presentation
      slides={[
        <CoverSlide key="cover" />,
        <IntroSlide key="intro" />,
        <AnalyticsSlide key="analytics" />,
        <QuoteSlide key="quote" />,
        <OutroSlide key="outro" />,
      ]}
    />
  );
}
