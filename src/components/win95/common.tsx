import { Button, Window, WindowContent, TableRow } from 'react95';
import styled from 'styled-components';

export const DialogOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
`;

export const DialogWindow = styled(Window)`
    width: 80%;
    left: 10%;
    top: 20%;
`;

export const DialogFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
    width: 100%;
`;

export const DialogWindowContent = styled(WindowContent)`
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

export const FooterButton = styled(Button)`
    margin-left: 16px;
    min-width: 90px;
`;

export const CustomTableRow = styled(TableRow)`
    cursor: default;
    &:hover {
        color: ${(styled: any) => styled.theme.canvasText};
        background-color: initial;
    }
`;

export const WindowCloseIcon = styled.span`
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-left: -1px;
    margin-top: -1px;
    transform: rotateZ(45deg);
    position: relative;

    &:before {
        content: '';
        position: absolute;
        height: 100%;
        width: 3px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #0a0a0a;
    }

    &:after {
        content: '';
        position: absolute;
        height: 3px;
        width: 100%;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        background-color: #0a0a0a;
    }
`;

export const FloatingButton = styled.button`
    width: 60px;
    height: 60px;
    position: absolute;
    bottom: 40px;
    right: 24px;
    z-index: 1;
    border-radius: 50%;
    background: rgb(185, 106, 201);
    border-width: 4px;
    border-style: solid;
    border-color: rgb(233, 128, 252) rgb(111, 45, 189) rgb(111, 45, 189) rgb(233, 128, 252);
    box-shadow: rgb(0 0 0 / 45%) 4px 4px 10px 0px;

    &:after {
        content: '';
        display: inline-block;
        width: 100%;
        height: 100%;
        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADKgAAAyoBEJdYGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHWSURBVHic7d3BbdYwGIDhz1wYAakXNmOGdhKY4d+MC1JH4BQurcQ1EmmE3+cZwLbkV04OjrKO45idrLWeZ+b7RcO/HMfx46Kxb/Hp7gVwLwHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAuB0DePpPx77F2umXMWutzzPzc2a+XDTF68x8PY7j90Xjf7g1M893L+IfeZqZb3Pd5r97nZnHzPy6eJ4PsWZmnyOA03Z8B+AEAcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAohzLfy8va6F+zDklO0+DNnqEfC2MY8Lp3jstPkzmwXw5sqjeYtj/287BsAJAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxfwAw2y4BcmRzJgAAAABJRU5ErkJggg==');
        background-size: 30px;
        background-repeat: no-repeat;
        filter: drop-shadow(rgb(233, 128, 252) 1px 1px 0px) drop-shadow(rgb(111, 45, 189) -1px -1px 0px);
        background-position: center center;
    }

    &:active {
        border-width: 4px;
        border-style: solid;
        border-color: rgb(111, 45, 189) rgb(233, 128, 252) rgb(233, 128, 252) rgb(111, 45, 189);
        box-shadow: rgb(0 0 0 / 55%) 3px 3px 5px 0px;
    }
`;
