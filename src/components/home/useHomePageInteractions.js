import { useEffect, useState } from 'react';

export default function useHomePageInteractions({ heroSlidesCount, reviewsCount }) {
	const [activeSlide, setActiveSlide] = useState(0);
	const [activeReview, setActiveReview] = useState(0);
	const [activeSection, setActiveSection] = useState('home');
	const [activeWhyFeature, setActiveWhyFeature] = useState(0);
	const [activeFaqId, setActiveFaqId] = useState(null);
	const [isAiFinderOpen, setIsAiFinderOpen] = useState(false);

	useEffect(() => {
		if (heroSlidesCount <= 1) {
			return undefined;
		}

		const timer = window.setInterval(() => {
			setActiveSlide((prev) => (prev + 1) % heroSlidesCount);
		}, 4500);

		return () => window.clearInterval(timer);
	}, [heroSlidesCount]);

	useEffect(() => {
		const revealElements = document.querySelectorAll('[data-reveal]');
		if (revealElements.length === 0) {
			return undefined;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) {
						return;
					}

					const delay = entry.target.getAttribute('data-reveal-delay');
					if (delay) {
						entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
					}

					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				});
			},
			{
				threshold: 0.14,
				rootMargin: '0px 0px -10% 0px',
			}
		);

		revealElements.forEach((element) => observer.observe(element));

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const getCardIndexAtViewportLine = (selector, currentIndex = 0) => {
			if (window.innerWidth >= 640) {
				return currentIndex;
			}

			const cards = Array.from(document.querySelectorAll(selector));
			if (cards.length === 0) {
				return 0;
			}

			const activationLine = window.innerHeight * 0.5;
			const clampedCurrentIndex = Math.min(cards.length - 1, Math.max(0, currentIndex));
			const currentTop = cards[clampedCurrentIndex]?.getBoundingClientRect().top ?? activationLine;

			if (Math.abs(currentTop - activationLine) <= 34) {
				return clampedCurrentIndex;
			}

			let closestIndex = clampedCurrentIndex;
			let closestDistance = Number.POSITIVE_INFINITY;

			cards.forEach((card, index) => {
				const top = card.getBoundingClientRect().top;
				const distance = Math.abs(top - activationLine);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = index;
				}
			});

			return closestIndex;
		};

		const handleSectionScroll = () => {
			const sections = [
				{ id: 'home', element: document.getElementById('home') },
				{ id: 'services', element: document.getElementById('services') },
				{ id: 'about', element: document.getElementById('about') },
				{ id: 'appointment', element: document.getElementById('appointment') },
				{ id: 'forms', element: document.getElementById('forms') },
			];

			const scrollPosition = window.scrollY + window.innerHeight / 2;

			for (const section of sections) {
				if (section.element) {
					const rect = section.element.getBoundingClientRect();
					const elementTop = window.scrollY + rect.top;
					const elementBottom = elementTop + rect.height;

					if (scrollPosition >= elementTop && scrollPosition <= elementBottom) {
						setActiveSection(section.id);
						break;
					}
				}
			}

			setActiveWhyFeature((prev) => getCardIndexAtViewportLine('[data-mobile-why-card]', prev));
		};

		let rafId = null;
		let isTicking = false;

		const handleScroll = () => {
			if (isTicking) {
				return;
			}

			isTicking = true;
			rafId = window.requestAnimationFrame(() => {
				handleSectionScroll();
				isTicking = false;
			});
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleSectionScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (rafId !== null) {
				window.cancelAnimationFrame(rafId);
			}
		};
	}, []);

	const nextReview = () => {
		if (reviewsCount <= 0) {
			return;
		}
		setActiveReview((prev) => (prev + 1) % reviewsCount);
	};

	const prevReview = () => {
		if (reviewsCount <= 0) {
			return;
		}
		setActiveReview((prev) => (prev - 1 + reviewsCount) % reviewsCount);
	};

	return {
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
	};
}
