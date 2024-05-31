import { get } from "svelte/store";

export interface IContextMenuItem {
  text: string;
  hotkey?: string;
  disabled?: boolean;
  submenu?: ContextMenu;
  onclick?: (e: IContextMenuItemClickEvent) => void;
}

export interface IContextMenuItemClickEvent {
  handled: false,
  item: HTMLElement;
  label: HTMLElement;
  hotkey: HTMLElement;
  items: IContextMenuItem[];
  data: IContextMenuItem;
}

export class ContextMenu {
  private static hideAlls: {
    key: symbol;
    cb: () => void;
  }[] = [];

  static hideAll() {
    for (const v of ContextMenu.hideAlls)
      v.cb();
  }

  private key = Symbol();
  private container = document.body;
  private dom: HTMLElement | undefined;
  private root = true;
  private parent: ContextMenu | undefined;
  private shown = false;
  private submenus: ContextMenu[] = [];


  private _onclick = (e: MouseEvent & { target: HTMLElement }) => {
    if (this.dom && e.target != this.dom &&
      e.target.parentElement &&
      e.target.parentElement != this.dom &&
      !e.target.classList.contains('item') &&
      !e.target.parentElement.classList.contains('item')) {
      this.hideAll();
    }
  };

  private _onblur = () => {
    this.hideAll();
  };

  constructor(
    public items: IContextMenuItem[],
    private preventHideAfterItemClick = false,
  ) {
    this.container.addEventListener('click', this._onclick as any);
    this.container.addEventListener('contextmenu', this._onclick as any);
    window.addEventListener('blur', this._onblur);
    ContextMenu.hideAlls.push({ key: this.key, cb: this._onblur });
  }

  private getMenuDom() {
    const menu = document.createElement('div');
    menu.classList.add('context');

    for (const item of this.items) {
      menu.appendChild(this.itemToDomEl(item));
    }

    return menu;
  }

  private itemToDomEl(data: IContextMenuItem) {
    const item = document.createElement('div');

    if (!data.text) {
      item.className = 'separator';
      return item;
    }

    // if (data.hasOwnProperty('color') && /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(data.color.toString())) {
    //   item.style.cssText = `color: ${data.color}`;
    // }

    item.classList.add('item');

    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = data.text;
    item.appendChild(label);

    if (data.disabled) {
      item.classList.add('disabled');
    } else {
      item.classList.add('enabled');
    }

    const hotkey = document.createElement('span');
    hotkey.className = 'hotkey';
    hotkey.innerHTML = data.hotkey || '';
    item.appendChild(hotkey);

    if (data.submenu) {
      const menu = data.submenu;
      menu.root = false;
      menu.parent = this;

      const openSubItems = () => {
        if (data.hasOwnProperty('disabled') && data['disabled'] == true)
          return;

        this.hideSubMenus();

        const x = this.dom!.offsetLeft + this.dom!.clientWidth + item.offsetLeft;
        const y = this.dom!.offsetTop + item.offsetTop;

        if (!menu.shown) {
          menu.show(x, y);
        } else {
          menu.hide();
        }
      };

      this.submenus.push(menu);

      item.classList.add('has-subitems');
      item.addEventListener('click', openSubItems);
      item.addEventListener('mousemove', openSubItems);
    } else {
      item.addEventListener('click', e => {
        this.hideSubMenus();

        if (item.classList.contains('disabled'))
          return;

        if (data.onclick && !data.disabled) {
          const event: IContextMenuItemClickEvent = {
            handled: false,
            item: item,
            label: label,
            hotkey: hotkey,
            items: this.items,
            data: data
          };

          data.onclick(event);

          if (!event.handled && !this.preventHideAfterItemClick) {
            this.hide();
          }
        } else {
          if (!this.preventHideAfterItemClick)
            this.hide();
        }
      });

      item.addEventListener('mousemove', e => {
        this.hideSubMenus();
      });
    }

    return item;
  }

  private hideAll() {
    if (this.root && !this.parent) {
      if (this.shown) {
        this.hideSubMenus();

        this.shown = false;
        this.container.removeChild(this.dom!);

        // if (this.parent && this.parent.shown) {
        //   this.parent.hide();
        // }
      }

      return;
    }

    this.parent!.hide();
  }

  private hide() {
    if (this.dom && this.shown) {
      this.shown = false;
      this.hideSubMenus();
      this.container.removeChild(this.dom);

      if (this.parent && this.parent.shown) {
        this.parent.hide();
      }
    }
  }

  private hideSubMenus() {
    for (const menu of this.submenus) {
      if (menu.shown) {
        menu.shown = false;
        menu.container.removeChild(menu.dom!);
      }
      menu.hideSubMenus();
    }
  }

  private show(x: number, y: number) {
    this.dom = this.getMenuDom();
    this.container.appendChild(this.dom);
    setTimeout(() => {
      const rect = this.dom!.getClientRects()[0];
      const offset = 8;
      const maxWidth = window.innerWidth - offset;
      const maxHeight = window.innerHeight - offset;
      if (x + rect.width > maxWidth)
        x = x - rect.width;
      if (y + rect.height > maxHeight)
        y = maxHeight - rect.height;

      this.dom!.style.left = `${x}px`;
      this.dom!.style.top = `${y}px`;

      this.shown = true;
    }, 0);
  }

  open(mouseEvent: MouseEvent) {
    mouseEvent.preventDefault();
    if (!this.items.length) return;
    let e = mouseEvent as MouseEvent & { target: HTMLElement };
    if (e.target != this.dom &&
      e.target.parentElement &&
      e.target.parentElement != this.dom &&
      !e.target.classList.contains('item') &&
      !e.target.parentElement.classList.contains('item')) {
      ContextMenu.hideAll();
      this.show(e.clientX, e.clientY);
    }
  };

  destroy() {
    delete this.dom;
    this.container.removeEventListener('click', this._onclick as any);
    this.container.removeEventListener('contextmenu', this._onclick as any);
    window.removeEventListener('blur', this._onblur);
    const exi = ContextMenu.hideAlls.findIndex(v => v.key === this.key);
    if (~exi) ContextMenu.hideAlls.splice(exi, 1);
  }
}