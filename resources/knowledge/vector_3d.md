# 向量与立体几何

## 向量基础

### 向量运算
$$\vec{a} = (x_1, y_1, z_1), \quad \vec{b} = (x_2, y_2, z_2)$$

- 加法：$\vec{a} + \vec{b} = (x_1+x_2, y_1+y_2, z_1+z_2)$
- 数乘：$\lambda\vec{a} = (\lambda x_1, \lambda y_1, \lambda z_1)$

### 数量积（点乘）
$$\vec{a} \cdot \vec{b} = x_1x_2 + y_1y_2 + z_1z_2 = |\vec{a}||\vec{b}|\cos\theta$$

- $\vec{a} \perp \vec{b} \iff \vec{a} \cdot \vec{b} = 0$

### 向量积（叉乘）
$$\vec{a} \times \vec{b} = \begin{vmatrix} \vec{i} & \vec{j} & \vec{k} \\ x_1 & y_1 & z_1 \\ x_2 & y_2 & z_2 \end{vmatrix}$$

$|\vec{a} \times \vec{b}| = |\vec{a}||\vec{b}|\sin\theta$，方向由右手定则确定。

- 面积：$S = |\vec{a} \times \vec{b}|$
- $\vec{a} \parallel \vec{b} \iff \vec{a} \times \vec{b} = \vec{0}$

## 空间中的平面与直线

### 平面方程
点法式：$A(x - x_0) + B(y - y_0) + C(z - z_0) = 0$

一般式：$Ax + By + Cz + D = 0$

### 两平面夹角
$$\cos\theta = \frac{|A_1A_2 + B_1B_2 + C_1C_2|}{\sqrt{A_1^2+B_1^2+C_1^2}\sqrt{A_2^2+B_2^2+C_2^2}}$$

### 点面距
$$d = \frac{|Ax_0 + By_0 + Cz_0 + D|}{\sqrt{A^2 + B^2 + C^2}}$$

## 立体几何体积公式

### 棱柱/圆柱
$$V = Sh$$

### 棱锥/圆锥
$$V = \frac{1}{3}Sh$$

### 球体
$$V = \frac{4}{3}\pi r^3, \quad S = 4\pi r^2$$

### 台体
$$V = \frac{1}{3}h(S_1 + S_2 + \sqrt{S_1S_2})$$
