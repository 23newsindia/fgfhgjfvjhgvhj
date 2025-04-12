class ABCarousel {
    constructor(element) {
        this.carousel = element;
        this.inner = this.carousel.querySelector('.abc-carousel-inner');
        this.slides = Array.from(this.carousel.querySelectorAll('.abc-slide'));
        this.dots = Array.from(this.carousel.querySelectorAll('.abc-dot'));
        this.prevBtn = this.carousel.querySelector('.abc-carousel-prev');
        this.nextBtn = this.carousel.querySelector('.abc-carousel-next');
        
        // Get settings from data attribute
        this.settings = JSON.parse(this.carousel.getAttribute('data-settings'));
        
        // Current state
        this.currentIndex = 0;
        this.isAnimating = false;
        this.autoPlayInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        // Initialize
        this.init();
    }
    
    init() {
    // Set up initial styles
    this.setupSlider();
    
    // Load first image immediately
    this.loadFirstSlide();
    
    // Set up lazy loading for other images
    this.lazyLoadImages();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start autoplay if enabled
    if (this.settings.autoplay) {
        this.startAutoPlay();
    }
}

loadFirstSlide() {
    const firstSlideImg = this.slides[0]?.querySelector('img');
    if (firstSlideImg) {
        firstSlideImg.loading = 'eager';
        firstSlideImg.fetchpriority = 'high';
        firstSlideImg.decoding = 'sync';
        firstSlideImg.src = firstSlideImg.dataset.src || firstSlideImg.src;
    }
}






  
  lazyLoadImages() {
    const lazyImages = this.carousel.querySelectorAll('.abc-slide-image:not(.abc-first-slide)');
    
    lazyImages.forEach(img => {
        // Skip if already loaded or has no src
        if (img.classList.contains('loaded') || !img.dataset.src) return;
        
        // Set placeholder SVG
        img.src = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' 
                  width='${img.width || 300}' height='${img.height || 200}' 
                  viewBox='0 0 ${img.width || 300} ${img.height || 200}'%3E%3C/svg%3E`;
        
        // Load when visible
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src || lazyImage.src;
                    lazyImage.classList.add('loaded');
                    observer.unobserve(lazyImage);
                }
            });
        }, {
            rootMargin: '100px 0px' // Load 100px before entering viewport
        });
        
        observer.observe(img);
    });
}









  
    setupSlider() {
        // Set initial slide positions
        this.slides.forEach((slide, index) => {
            slide.style.flex = `0 0 ${100 / this.settings.slides_to_show}%`;
            
            if (this.settings.variable_width) {
                slide.style.flex = '0 0 auto';
                slide.style.width = 'auto';
            }
        });
        
        // Update active dot
        this.updateDots();
    }
    
    setupEventListeners() {
        // Navigation buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Dot navigation
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'));
                this.goToSlide(index);
            });
        });
        
        // Touch events for mobile
        this.inner.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.pauseAutoPlay();
        }, { passive: true });
        
        this.inner.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe();
            if (this.settings.autoplay) {
                this.resumeAutoPlay();
            }
        }, { passive: true });
        
        // Pause on hover if enabled
        if (this.settings.pause_on_hover) {
            this.carousel.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.carousel.addEventListener('mouseleave', () => {
                if (this.settings.autoplay) {
                    this.resumeAutoPlay();
                }
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    prioritizeFirstSlide() {
        const firstSlideImg = this.slides[0]?.querySelector('img');
        if (firstSlideImg) {
            firstSlideImg.loading = 'eager';
            firstSlideImg.fetchpriority = 'high';
            firstSlideImg.decoding = 'sync';
        }
    }
    
    handleResize() {
        // Adjust slides for responsive behavior
        if (this.settings.responsive) {
            const breakpoint = this.settings.responsive.find(bp => 
                window.innerWidth <= bp.breakpoint
            );
            
            if (breakpoint) {
                this.applyResponsiveSettings(breakpoint.settings);
            } else {
                this.applyResponsiveSettings(this.settings);
            }
        }
        
        // Re-center current slide
        this.goToSlide(this.currentIndex, false);
    }
    
    applyResponsiveSettings(settings) {
        this.slides.forEach(slide => {
            if (settings.variable_width === false) {
                slide.style.flex = `0 0 ${100 / settings.slides_to_show}%`;
                slide.style.width = '';
            } else {
                slide.style.flex = '0 0 auto';
                slide.style.width = 'auto';
            }
        });
    }
    
    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        const swipeThreshold = 50; // Minimum swipe distance in pixels
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }
    
    goToSlide(index, animate = true) {
        // Don't animate if already on the target slide or during animation
        if (this.isAnimating || index === this.currentIndex) {
            return;
        }
        
        // Handle infinite loop
        if (this.settings.infinite_loop) {
            if (index < 0) {
                index = this.slides.length - 1;
            } else if (index >= this.slides.length) {
                index = 0;
            }
        } else {
            // Clamp index within bounds
            index = Math.max(0, Math.min(index, this.slides.length - 1));
        }
        
        this.isAnimating = animate;
        this.currentIndex = index;
        
        // Calculate scroll position
        const slide = this.slides[index];
        const scrollPosition = slide.offsetLeft - (this.inner.offsetWidth - slide.offsetWidth) / 2;
        
        // Apply transition
        if (animate) {
            this.inner.style.transition = `transform ${this.settings.animation_speed}ms ease`;
        } else {
            this.inner.style.transition = 'none';
        }
        
        // Scroll to the slide
        this.inner.style.transform = `translateX(-${scrollPosition}px)`;
        
        // Update dots
        this.updateDots();
        
        // Reset transition after animation completes
        if (animate) {
            setTimeout(() => {
                this.isAnimating = false;
                this.inner.style.transition = '';
            }, this.settings.animation_speed);
        }
    }
    
    nextSlide() {
        this.goToSlide(this.currentIndex + 1);
    }
    
    prevSlide() {
        this.goToSlide(this.currentIndex - 1);
    }
    
    updateDots() {
        if (this.dots.length > 0) {
            this.dots.forEach(dot => dot.classList.remove('active'));
            const activeDot = this.dots[this.currentIndex];
            if (activeDot) {
                activeDot.classList.add('active');
            }
        }
    }
    
    startAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
        
        this.autoPlayInterval = setInterval(() => {
            this.nextSlide();
        }, this.settings.autoplay_speed);
    }
    
    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    resumeAutoPlay() {
        if (!this.autoPlayInterval && this.settings.autoplay) {
            this.startAutoPlay();
        }
    }
    
    
    
    
    
}




// Initialize all carousels on the page
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.abc-banner-carousel').forEach(carousel => {
        new ABCarousel(carousel);
    });
});