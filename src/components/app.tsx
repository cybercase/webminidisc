import React from 'react';
import { useShallowEqualSelector } from '../utils';
import { actions as appActions } from '../redux/app-feature';

import CssBaseline from '@material-ui/core/CssBaseline';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles, createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import { Welcome } from './welcome';
import { Main } from './main';
import { Controls } from './controls';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import Box from '@material-ui/core/Box';
import Brightness2Icon from '@material-ui/icons/Brightness2';
import IconButton from '@material-ui/core/IconButton';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles(theme => ({
    layout: {
        width: 'auto',
        height: '100%',
        [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
            width: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        [theme.breakpoints.up(700 + theme.spacing(2) * 2)]: {
            width: 700,
        },
    },

    paper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: theme.spacing(2),
        height: '100%',
        [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
            marginTop: theme.spacing(6),
            marginBottom: theme.spacing(6),
            padding: theme.spacing(3),
            height: 600,
        },
        [theme.breakpoints.up(700 + theme.spacing(2) * 2)]: {
            height: 700,
        },
    },
    copyright: {
        display: 'flex',
        alignItems: 'center',
        [theme.breakpoints.down(600 + theme.spacing(2) * 2)]: {
            flexWrap: 'wrap',
        },
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    minidiscLogo: {
        width: 48,
    },
    controlsContainer: {
        flex: '1 1 auto',
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(8),
        [theme.breakpoints.down(600 + theme.spacing(2) * 2)]: {
            order: -1,
            width: '100%',
            paddingLeft: 0,
        },
    },
}));

const darkTheme = createMuiTheme({
    palette: {
        type: 'dark',
        primary: {
            light: '#6ec6ff',
            main: '#2196f3',
            dark: '#0069c0',
            contrastText: '#fff',
        },
    },
});

const lightTheme = createMuiTheme({
    palette: {
        type: 'light',
    },
});

const App = () => {
    const classes = useStyles();

    const dispatch = useDispatch();
    let { mainView, loading, darkMode } = useShallowEqualSelector(state => state.appState);

    return (
        <React.Fragment>
            <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
                <CssBaseline />

                <main className={classes.layout}>
                    <Paper className={classes.paper}>
                        {mainView === 'WELCOME' ? <Welcome /> : null}
                        {mainView === 'MAIN' ? <Main /> : null}

                        <Box className={classes.copyright}>
                            <IconButton onClick={() => dispatch(appActions.setDarkMode(!darkMode))}>
                                <Brightness2Icon color={darkMode ? 'secondary' : undefined} />
                            </IconButton>
                            <Typography variant="body2" color="textSecondary" style={{ marginRight: `8px` }}>
                                {'© '}
                                <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://stefano.brilli.me/">
                                    Stefano Brilli
                                </Link>{' '}
                                {new Date().getFullYear()}
                                {'.'}
                            </Typography>
                            <Box className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</Box>
                        </Box>
                    </Paper>
                </main>

                <Backdrop className={classes.backdrop} open={loading}>
                    <CircularProgress color="inherit" />
                </Backdrop>
            </ThemeProvider>
        </React.Fragment>
    );
};

export default App;
