import React from 'react';
import { List, ListItem, Checkbox, Divider } from 'react95';
import { Views } from '../../redux/app-feature';

export const W95TopMenu = (props: {
    mainView: Views;
    onClick?: () => void;
    handleWipeDisc: () => void;
    handleRefresh: () => void;
    handleRenameDisc: () => void;
    handleExit: () => void;
    handleShowAbout: () => void;
    handleVintageMode: () => void;
}) => {
    const items = [];

    if (props.mainView === 'MAIN') {
        items.push(
            <ListItem key="update" onClick={props.handleRefresh}>
                Reload TOC
            </ListItem>
        );
        items.push(
            <ListItem key="title" onClick={props.handleRenameDisc}>
                Rename Disc
            </ListItem>
        );
        items.push(
            <ListItem key="wipe" onClick={props.handleWipeDisc}>
                Wipe Disc
            </ListItem>
        );
        items.push(
            <ListItem key="vintage" onClick={props.handleVintageMode}>
                <Checkbox checked name="vintageMode" variant="menu" value="vintageMode" label="Retro Mode (beta)" defaultChecked />
            </ListItem>
        );

        items.push(<Divider key="d1" />);
        items.push(
            <ListItem key="exit" onClick={props.handleExit}>
                Exit
            </ListItem>
        );
        items.push(<Divider key="d2" />);
    }
    items.push(
        <ListItem key="about" onClick={props.handleShowAbout}>
            About...
        </ListItem>
    );
    items.push(
        <ListItem key={`menu-gh`}>
            <a rel="noopener noreferrer" href="https://github.com/cybercase/webminidisc" target="_blank">
                Fork me on GitHub
            </a>
        </ListItem>
    );
    return (
        <List
            style={{
                position: 'absolute',
                left: '0',
                top: '100%',
                zIndex: '9999',
            }}
            onClick={props.onClick}
        >
            {items}
        </List>
    );
};
