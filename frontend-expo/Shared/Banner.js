import React, { useState, useEffect } from "react";
import { Image, StyleSheet, Dimensions, View } from "react-native";
import Swiper from "react-native-swiper";

var { width } = Dimensions.get("window");

/**
 * Carousel images: replace with your own.
 * - Slide 1: assets/images/carousel1-sample.png
 * - Slide 2: assets/images/carousel2-sample.png
 * - Slide 3: assets/images/carousel3-sample.png
 */
const Banner = () => {
    const [bannerData, setBannerData] = useState([]);

    useEffect(() => {
        setBannerData([
            require("../assets/images/carousel1-sample.png"),
            require("../assets/images/carousel2-sample.png"),
            require("../assets/images/carousel3-sample.png"),
        ]);
        return () => setBannerData([]);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.swiper}>
                <Swiper
                    style={{ height: width / 2 }}
                    showButtons={false}
                    autoplay={true}
                    autoplayTimeout={3}
                >
                    {bannerData.map((item, index) => (
                        <Image
                            key={index}
                            style={styles.imageBanner}
                            resizeMode="cover"
                            source={item}
                        />
                    ))}
                </Swiper>
                <View style={{ height: 12 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fafafa",
    },
    swiper: {
        width: width,
        alignItems: "center",
        marginTop: 4,
    },
    imageBanner: {
        height: width / 2,
        width: width,
    },
});

export default Banner;
