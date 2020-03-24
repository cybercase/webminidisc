import React from 'react';
import { useDispatch } from 'react-redux';
import { batchActions } from 'redux-batched-actions';

import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';

import { wipeDisc, listContent } from '../redux/actions';
import { actions as appActions } from '../redux/app-feature';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { useShallowEqualSelector } from '../utils';
import Link from '@material-ui/core/Link';

export const TopMenu = function() {
    const dispatch = useDispatch();

    let { mainView } = useShallowEqualSelector(state => state.appState);
    let disc = useShallowEqualSelector(state => state.main.disc);

    const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleWipeDisc = () => {
        dispatch(wipeDisc());
        handleMenuClose();
    };

    const handleRefresh = () => {
        dispatch(listContent());
        handleMenuClose();
    };

    const handleRenameDisc = () => {
        dispatch(
            batchActions([
                renameDialogActions.setVisible(true),
                renameDialogActions.setCurrentName(disc?.title ?? ``),
                renameDialogActions.setIndex(-1),
            ])
        );
        handleMenuClose();
    };

    const handleExit = () => {
        dispatch(appActions.setState('WELCOME'));
        handleMenuClose();
    };
    const handleShowAbout = () => {
        dispatch(appActions.showAboutDialog(true));
        handleMenuClose();
    };

    const menuItems = [];
    if (mainView === 'MAIN') {
        menuItems.push(
            <MenuItem key="update" onClick={handleRefresh}>
                Refresh
            </MenuItem>
        );
        menuItems.push(
            <MenuItem key="title" onClick={handleRenameDisc}>
                Rename Disc
            </MenuItem>
        );
        menuItems.push(
            <MenuItem key="wipe" onClick={handleWipeDisc}>
                Wipe Disc
            </MenuItem>
        );
        menuItems.push(
            <MenuItem key="exit" onClick={handleExit}>
                Exit
            </MenuItem>
        );
    }
    menuItems.push(
        <MenuItem key="about" onClick={handleShowAbout}>
            About
        </MenuItem>
    );
    menuItems.push(
        <MenuItem key="github" onClick={handleMenuClose}>
            <Link rel="noopener noreferrer" href="https://github.com/cybercase/webminidisc" target="_blank">
                Fork me on GitHub
            </Link>
        </MenuItem>
    );

    return (
        <React.Fragment>
            <IconButton aria-label="actions" aria-controls="actions-menu" aria-haspopup="true" onClick={handleMenuClick}>
                <MoreVertIcon />
            </IconButton>
            <Menu id="actions-menu" anchorEl={menuAnchorEl} keepMounted open={menuOpen} onClose={handleMenuClose}>
                {menuItems}
            </Menu>
        </React.Fragment>
    );
};
