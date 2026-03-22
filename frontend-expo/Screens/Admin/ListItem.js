import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    Modal,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import EasyButton from "../../Shared/StyledComponents/EasyButton";

var { width } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const ListItem = ({ item, index, deleteProduct, isDeleting = false }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const navigation = useNavigation();
    const itemId = item.id || item._id;

    return (
        <View>
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                        <EasyButton
                            medium
                            secondary
                            onPress={() => {
                                navigation.navigate("ProductForm", { item });
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Edit</Text>
                        </EasyButton>
                        <EasyButton
                            medium
                            danger
                            onPress={() => {
                                deleteProduct(itemId);
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Delete</Text>
                        </EasyButton>
                    </View>
                </View>
            </Modal>
            <TouchableOpacity
                onPress={() =>
                    navigation.navigate("Home", {
                        screen: "Product Detail",
                        params: { item },
                    })
                }
                onLongPress={() => setModalVisible(true)}
                style={[
                    styles.container,
                    {
                        backgroundColor: index % 2 === 0 ? "#fff" : "#f2f2f2",
                    },
                ]}
            >
                <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    resizeMode="cover"
                    style={styles.image}
                />
                <Text style={styles.item} numberOfLines={1}>{item.brand}</Text>
                <Text style={styles.item} numberOfLines={1} ellipsizeMode="tail">
                    {item.name || ""}
                </Text>
                <Text style={styles.item} numberOfLines={1} ellipsizeMode="tail">
                    {item.category ? item.category.name : ""}
                </Text>
                <Text style={styles.item}>$ {Number(item.price || 0).toFixed(2)}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("ProductForm", { item })}
                    >
                        <Ionicons name="create-outline" size={18} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteProduct(itemId)}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#c62828" />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color="#c62828" />
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 6,
        width: width,
        borderBottomWidth: 1,
        borderBottomColor: "#e7e7e7",
    },
    image: {
        borderRadius: 8,
        width: width / 6,
        height: 46,
        margin: 2,
        backgroundColor: "#e4e4e4",
    },
    item: {
        color: "#1e1e1e",
        fontSize: 12,
        margin: 3,
        width: width / 6,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 4,
    },
    actionButton: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#d4d4d4",
        backgroundColor: "#f4f4f4",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 3,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 20,
        alignItems: "center",
    },
    closeButton: {
        alignSelf: "flex-end",
        position: "absolute",
        top: 5,
        right: 10,
    },
    textStyle: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default ListItem;
