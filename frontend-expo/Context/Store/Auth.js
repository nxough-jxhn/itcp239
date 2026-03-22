/**
 * Auth context provider: holds login state (isAuthenticated, user) and exposes dispatch.
 * Login/Register screens call Auth.actions (loginUser, etc.); success updates this state.
 */
import React, { useEffect, useReducer, useState } from "react";
import { jwtDecode } from "jwt-decode";

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from './AuthGlobal';
import { getJwtToken, removeJwtToken } from "../../assets/common/authToken";

const Auth = props => {
    const [stateUser, dispatch] = useReducer(authReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        let mounted = true;

        const restoreAuth = async () => {
            // [Unit 2] Resolve auth before mounting navigator trees to avoid route reset races.
            try {
                const token = await getJwtToken();
                if (token) {
                    try {
                        const decoded = jwtDecode(token);
                        dispatch(setCurrentUser(decoded));
                    } catch (_e) {
                        await removeJwtToken();
                        dispatch(setCurrentUser({}));
                    }
                } else {
                    dispatch(setCurrentUser({}));
                }
            } catch (_e) {
                dispatch(setCurrentUser({}));
            } finally {
                if (mounted) {
                    setShowChild(true);
                }
            }
        };

        restoreAuth();

        return () => {
            mounted = false;
            setShowChild(false);
        };
    }, []);

    if (!showChild) {
        return null;
    }
    return (
        <AuthGlobal.Provider value={{ stateUser, dispatch }}>
            {props.children}
        </AuthGlobal.Provider>
    );
};

export default Auth;
