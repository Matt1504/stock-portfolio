import { ReactNode } from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

type CcProps = {
    slides: number,
    auto: boolean,
    children: ReactNode
};

const CarouselComponent = (props: CcProps) => {
    const { slides, auto, children } = props;
    const responsive = {
        desktop: {
          breakpoint: { max: 3000, min: 1024 },
          items: slides,
          slidesToSlide: slides // optional, default to 1.
        },
        tablet: {
          breakpoint: { max: 1024, min: 464 },
          items: 2,
          slidesToSlide: 2 // optional, default to 1.
        },
        mobile: {
          breakpoint: { max: 464, min: 0 },
          items: 1,
          slidesToSlide: 1 // optional, default to 1.
        }
    };

    return (
        <Carousel
          swipeable={true}
          draggable={true}
          responsive={responsive}
          autoPlay={auto}
          infinite={auto}
          autoPlaySpeed={5000}
          keyBoardControl={true}
          customTransition="all .5"
          arrows={false}
          transitionDuration={100}
          containerClass="carousel-container"
          dotListClass="custom-dot-list-style"
          itemClass="carousel-item-padding-40-px"
        >
            {children}
        </Carousel>
    )
}

export default CarouselComponent;
