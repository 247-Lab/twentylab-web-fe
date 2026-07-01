'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import HomeAppointmentSection from '@/components/home/sections/HomeAppointmentSection';
import HomeBreadcrumbs from '@/components/home/sections/HomeBreadcrumbs';
import HomeFaqSection from '@/components/home/sections/HomeFaqSection';
import HomeHeroSection from '@/components/home/sections/HomeHeroSection';
import HomeProcessSection from '@/components/home/sections/HomeProcessSection';
import HomeReviewsSection from '@/components/home/sections/HomeReviewsSection';
import HomeServicesSection from '@/components/home/sections/HomeServicesSection';
import HomeWhyChooseSection from '@/components/home/sections/HomeWhyChooseSection';
import useHomePageInteractions from '@/components/home/useHomePageInteractions';

const AITestFinderModal = dynamic(() => import('@/components/common/AITestFinderModal'));

export default function HomePage({ locale = 'en' }) {
	const t = useTranslations('HomePage');
	const heroSlides = t.raw('Hero.slides');
	const serviceCards = t.raw('Services.items');
	const whyChooseFeatures = t.raw('WhyChoose.items');
	const whyChooseLeftTape = [...whyChooseFeatures, ...whyChooseFeatures];
	const whyChooseRightBase = [...whyChooseFeatures.slice(3), ...whyChooseFeatures.slice(0, 3)];
	const whyChooseRightTape = [...whyChooseRightBase, ...whyChooseRightBase];
	const processSteps = t.raw('Process.items');
	const certificationLogos = t.raw('Reviews.certificationLogos');
	const certificationMarqueeLogos = [...certificationLogos, ...certificationLogos];
	const reviews = t.raw('Reviews.items');
	const faqLeft = t.raw('FAQ.itemsLeft');
	const faqRight = t.raw('FAQ.itemsRight');
	const appointmentLocations = t.raw('Appointment.locations');
	const breadcrumbItems = t.raw('Breadcrumb.items');

	const {
		activeSlide,
		setActiveSlide,
		activeReview,
		nextReview,
		prevReview,
		activeSection,
		activeWhyFeature,
		activeFaqId,
		setActiveFaqId,
		isAiFinderOpen,
		setIsAiFinderOpen,
	} = useHomePageInteractions({
		heroSlidesCount: heroSlides.length,
		reviewsCount: reviews.length,
	});

	return (
		<div className="relative isolate overflow-clip bg-white text-slate-900">
			<main>
				<HomeHeroSection
					t={t}
					heroSlides={heroSlides}
					activeSlide={activeSlide}
					setActiveSlide={setActiveSlide}
					setIsAiFinderOpen={setIsAiFinderOpen}
				/>
				<HomeServicesSection t={t} serviceCards={serviceCards} />
				<HomeWhyChooseSection
					t={t}
					whyChooseFeatures={whyChooseFeatures}
					whyChooseLeftTape={whyChooseLeftTape}
					whyChooseRightTape={whyChooseRightTape}
					activeWhyFeature={activeWhyFeature}
				/>
				<HomeProcessSection t={t} processSteps={processSteps} />
				<HomeReviewsSection
					t={t}
					certificationMarqueeLogos={certificationMarqueeLogos}
					reviews={reviews}
					activeReview={activeReview}
					nextReview={nextReview}
					prevReview={prevReview}
				/>
				<HomeAppointmentSection t={t} appointmentLocations={appointmentLocations} />
				<HomeFaqSection
					t={t}
					faqLeft={faqLeft}
					faqRight={faqRight}
					activeFaqId={activeFaqId}
					setActiveFaqId={setActiveFaqId}
				/>
			</main>

			<HomeBreadcrumbs t={t} breadcrumbItems={breadcrumbItems} activeSection={activeSection} />
			{isAiFinderOpen ? <AITestFinderModal isOpen onClose={() => setIsAiFinderOpen(false)} locale={locale} /> : null}
		</div>
	);
}
